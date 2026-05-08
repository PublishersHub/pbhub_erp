import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePayrollCycleDto } from '../dto/create-payroll-cycle.dto';
import { NotificationEvents } from '../../notification/events/event-types';
import { PayslipPdfService } from './payslip-pdf.service';
import { MailerService } from '../../../common/mail/mail.service';

@Injectable()
export class PayrollCyclesService {
  private readonly logger = new Logger(PayrollCyclesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly payslipPdf: PayslipPdfService,
    private readonly mailer: MailerService,
  ) {}

  async create(organizationId: string, dto: CreatePayrollCycleDto) {
    const periodStart = new Date(Date.UTC(dto.year, dto.month - 1, 1));
    const periodEnd = new Date(Date.UTC(dto.year, dto.month, 0)); // last day of month

    try {
      return await this.prisma.payrollCycle.create({
        data: {
          organizationId,
          year: dto.year,
          month: dto.month,
          periodStart,
          periodEnd,
          status: 'DRAFT',
          notes: dto.notes ?? null,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          `A payroll cycle for ${dto.year}-${String(dto.month).padStart(2, '0')} already exists`,
        );
      }
      throw error;
    }
  }

  async findAll(organizationId: string, year?: number) {
    return this.prisma.payrollCycle.findMany({
      where: {
        organizationId,
        ...(year !== undefined && { year }),
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async findById(organizationId: string, id: string) {
    const cycle = await this.prisma.payrollCycle.findFirst({
      where: { id, organizationId },
      include: {
        finalizedBy: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
      },
    });
    if (!cycle) throw new NotFoundException('Payroll cycle not found');
    return cycle;
  }

  async finalize(organizationId: string, cycleId: string, userId: string) {
    const cycle = await this.findById(organizationId, cycleId);

    if (cycle.status !== 'PROCESSED') {
      throw new BadRequestException(
        'Only PROCESSED payroll cycles can be finalized',
      );
    }

    // Resolve the employee performing finalization
    const employee = await this.prisma.employee.findFirst({
      where: { userId, organizationId },
    });
    if (!employee) {
      throw new NotFoundException('Finalizer employee record not found');
    }

    const updated = await this.prisma.payrollCycle.update({
      where: { id: cycleId },
      data: {
        status: 'FINALIZED',
        finalizedAt: new Date(),
        finalizedById: employee.id,
      },
    });

    // Notify all employees with a payroll in this cycle
    const payrolls = await this.prisma.payroll.findMany({
      where: { payrollCycleId: cycleId, organizationId },
      select: { employeeId: true },
    });
    const recipientEmployeeIds = payrolls.map((p) => p.employeeId);

    this.eventEmitter.emit(NotificationEvents.PAYROLL_CYCLE_FINALIZED, {
      organizationId,
      actorUserId: userId,
      referenceId: cycleId,
      referenceType: 'PayrollCycle',
      recipientEmployeeIds,
      variables: {
        year: cycle.year,
        month: cycle.month,
        period: `${cycle.year}-${String(cycle.month).padStart(2, '0')}`,
      },
    });

    // Auto-email payslip PDFs. Failures are logged per-payslip and never
    // fail the finalize as a whole — the cycle is already locked.
    const emailStats = await this.dispatchPayslipEmails(organizationId, cycleId);
    this.logger.log(
      `Cycle ${cycleId} payslip dispatch: sent=${emailStats.sent} failed=${emailStats.failed} skipped=${emailStats.skipped}`,
    );

    return updated;
  }

  /**
   * Generates a PDF for every payroll in the given cycle and emails it to
   * the employee at their canonical Account.email.
   *
   * Errors are caught per-payslip and logged with employeeId + cycleId.
   * Returns counters so the caller can log a summary.
   *
   * @param employeeId optional — if set, only that employee's payslip is sent
   */
  async dispatchPayslipEmails(
    organizationId: string,
    cycleId: string,
    employeeId?: string,
  ): Promise<{ sent: number; failed: number; skipped: number }> {
    const cycle = await this.prisma.payrollCycle.findFirst({
      where: { id: cycleId, organizationId },
      select: { id: true, year: true, month: true, periodStart: true },
    });
    if (!cycle) throw new NotFoundException('Payroll cycle not found');

    const payrolls = await this.prisma.payroll.findMany({
      where: {
        payrollCycleId: cycleId,
        organizationId,
        ...(employeeId ? { employeeId } : {}),
      },
      select: {
        id: true,
        employeeId: true,
        netPayable: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            user: {
              select: {
                account: { select: { email: true } },
              },
            },
          },
        },
      },
    });

    const monthLabel = new Date(cycle.periodStart).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const payroll of payrolls) {
      const recipient = payroll.employee.user?.account?.email;
      if (!recipient) {
        skipped += 1;
        this.logger.warn(
          `Payslip email skipped: no Account.email (cycle=${cycleId}, employeeId=${payroll.employeeId})`,
        );
        continue;
      }

      try {
        const pdf = await this.payslipPdf.generate(organizationId, payroll.id);
        const filename = `payslip-${cycle.year}-${String(cycle.month).padStart(2, '0')}-${payroll.employee.employeeCode}.pdf`;
        const netFmt = new Intl.NumberFormat('en-PK', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(Number(payroll.netPayable));

        const subject = `Your payslip for ${monthLabel}`;
        const text =
          `Hi ${payroll.employee.firstName},\n\n` +
          `Your ${monthLabel} payslip is attached. Net payable: PKR ${netFmt}.\n\n` +
          `If you have any questions, please reach out to HR.\n`;
        const html =
          `<p>Hi ${payroll.employee.firstName},</p>` +
          `<p>Your <strong>${monthLabel}</strong> payslip is attached. ` +
          `Net payable: <strong>PKR ${netFmt}</strong>.</p>` +
          `<p>If you have any questions, please reach out to HR.</p>`;

        await this.mailer.send({
          to: recipient,
          subject,
          body: text,
          html,
          attachments: [
            { filename, content: pdf, contentType: 'application/pdf' },
          ],
        });
        sent += 1;
      } catch (err) {
        failed += 1;
        this.logger.error(
          `Payslip email failed (cycle=${cycleId}, employeeId=${payroll.employeeId}): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return { sent, failed, skipped };
  }

  /**
   * HR-triggered re-send of payslip emails for a cycle. Useful when SMTP was
   * misconfigured during the original finalize. Optionally scoped to a single
   * employee via employeeId.
   */
  async resendPayslipEmails(
    organizationId: string,
    cycleId: string,
    employeeId?: string,
  ): Promise<{ sent: number; failed: number; skipped: number }> {
    const cycle = await this.prisma.payrollCycle.findFirst({
      where: { id: cycleId, organizationId },
      select: { id: true, status: true },
    });
    if (!cycle) throw new NotFoundException('Payroll cycle not found');
    if (cycle.status !== 'FINALIZED') {
      throw new BadRequestException(
        'Payslip emails can only be resent for FINALIZED cycles',
      );
    }
    return this.dispatchPayslipEmails(organizationId, cycleId, employeeId);
  }
}
