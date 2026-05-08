import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailerService } from '../../common/mail/mail.service';
import { renderBrandedHtml } from '../../common/mail/templates/branded-html';
import { AdminMailRecipientType, SendMailDto } from './dto/send-mail.dto';

interface ResolvedRecipient {
  employeeId: string;
  email: string;
}

interface RecipientDeliveryResult extends ResolvedRecipient {
  deliveredAt?: string;
  error?: string;
}

@Injectable()
export class AdminMailService {
  private readonly logger = new Logger(AdminMailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  async send(
    callerUserId: string,
    organizationId: string,
    dto: SendMailDto,
  ): Promise<{
    sent: number;
    failed: number;
    total: number;
    messageId: string;
  }> {
    // 1. Resolve sender's employee row (so we have a stable Employee.id)
    const sender = await this.prisma.employee.findFirst({
      where: { userId: callerUserId, organizationId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!sender) {
      throw new NotFoundException(
        'No active employee profile linked to your user account',
      );
    }

    // 2. Resolve recipients (Employee.id -> Account.email via User -> Account)
    const recipients = await this.resolveRecipients(organizationId, dto);
    if (recipients.length === 0) {
      throw new BadRequestException(
        'No deliverable recipients found for the selected criteria.',
      );
    }

    // 3. Build branded HTML wrapper using org branding
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        brandName: true,
        brandLogoUrl: true,
        brandPrimary: true,
        brandTagline: true,
        name: true,
      },
    });

    const senderName = `${sender.firstName} ${sender.lastName}`.trim();
    const subject = dto.subject.trim();
    const plainBody = dto.body;

    const htmlBody = renderBrandedHtml({
      branding: {
        brandName: org?.brandName ?? org?.name ?? null,
        brandLogoUrl: org?.brandLogoUrl ?? null,
        brandPrimary: org?.brandPrimary ?? null,
        brandTagline: org?.brandTagline ?? null,
      },
      preheader: dto.preheader?.trim() || subject,
      heading: subject,
      // We pass the user's plain text body in `intro`; renderer escapes HTML
      // and turns newlines via CSS. To preserve linebreaks, replace with <br/>.
      intro: plainBody,
      footerNote: `This message was sent by ${senderName} via ${
        org?.brandName ?? org?.name ?? 'the HR team'
      }.`,
    });

    // 4. Send per-recipient, capture results
    const results: RecipientDeliveryResult[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const r of recipients) {
      try {
        await this.mailer.send({
          to: r.email,
          subject,
          body: plainBody,
          html: htmlBody,
        });
        results.push({
          employeeId: r.employeeId,
          email: r.email,
          deliveredAt: new Date().toISOString(),
        });
        sentCount += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ employeeId: r.employeeId, email: r.email, error: message });
        failedCount += 1;
        this.logger.warn(
          `Admin mail delivery failed to ${r.email}: ${message}`,
        );
      }
    }

    // 5. Audit row
    const message = await this.prisma.adminMailMessage.create({
      data: {
        organizationId,
        senderId: sender.id,
        subject,
        body: plainBody,
        recipientCount: recipients.length,
        recipients: results as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    return {
      sent: sentCount,
      failed: failedCount,
      total: recipients.length,
      messageId: message.id,
    };
  }

  // ─── Recipient resolution ─────────────────

  private async resolveRecipients(
    organizationId: string,
    dto: SendMailDto,
  ): Promise<ResolvedRecipient[]> {
    let employeeWhere: Prisma.EmployeeWhereInput;

    switch (dto.recipientType) {
      case AdminMailRecipientType.ALL:
        employeeWhere = { organizationId, isActive: true };
        break;
      case AdminMailRecipientType.DEPARTMENT: {
        if (!dto.departmentId) {
          throw new BadRequestException(
            'departmentId is required when recipientType is "department"',
          );
        }
        const dept = await this.prisma.department.findFirst({
          where: { id: dto.departmentId, organizationId },
          select: { id: true },
        });
        if (!dept) {
          throw new NotFoundException('Department not found in this organization');
        }
        employeeWhere = {
          organizationId,
          isActive: true,
          departmentId: dto.departmentId,
        };
        break;
      }
      case AdminMailRecipientType.SPECIFIC: {
        if (!dto.employeeIds?.length) {
          throw new BadRequestException(
            'employeeIds is required when recipientType is "specific"',
          );
        }
        employeeWhere = {
          organizationId,
          isActive: true,
          id: { in: dto.employeeIds },
        };
        break;
      }
      default:
        throw new BadRequestException('Unknown recipientType');
    }

    const employees = await this.prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        user: {
          select: {
            account: { select: { email: true } },
          },
        },
      },
    });

    // Verify all explicit ids were found (and are in this org / active)
    if (dto.recipientType === AdminMailRecipientType.SPECIFIC) {
      const foundIds = new Set(employees.map((e) => e.id));
      const missing = (dto.employeeIds ?? []).filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Some employees were not found in this organization: ${missing.join(', ')}`,
        );
      }
    }

    // Drop those without a linked user/account email — we have nowhere to send
    const recipients: ResolvedRecipient[] = [];
    for (const emp of employees) {
      const email = emp.user?.account?.email;
      if (email) recipients.push({ employeeId: emp.id, email });
    }
    return recipients;
  }
}
