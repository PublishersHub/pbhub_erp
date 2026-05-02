import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailerService } from '../../../common/mail/mail.service';
import { renderBrandedHtml } from '../../../common/mail/templates/branded-html';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  async forgotPassword(email: string): Promise<{ __devToken?: string }> {
    const normalized = email.toLowerCase().trim();
    const account = await this.prisma.account.findUnique({ where: { email: normalized } });
    let rawToken: string | undefined;

    if (account && account.isActive) {
      try {
        rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        await this.prisma.passwordResetToken.create({
          data: { accountId: account.id, tokenHash, expiresAt },
        });

        const baseUrl = this.config.get<string>('app.appBaseUrl') ?? 'http://localhost:3000';
        const link = `${baseUrl}/reset-password?token=${rawToken}`;

        await this.mailer.send({
          to: account.email,
          subject: 'Reset your password',
          body: `Hi ${account.firstName},\n\nA password reset was requested for your account. Click the link below within 30 minutes to set a new password:\n\n${link}\n\nIf you didn't request this, ignore this email — your password will stay the same.`,
          html: renderBrandedHtml({
            preheader: 'Reset your PbHub HRMS password',
            heading: 'Reset your password',
            intro: `Hi ${account.firstName}, we received a request to reset your password. Click below to set a new one — this link expires in 30 minutes.`,
            ctaLabel: 'Reset password',
            ctaUrl: link,
            footerNote: `If you didn't request this, ignore this email — your password will stay the same.`,
          }),
        });
      } catch (err) {
        this.logger.error(
          `Failed to send password reset for ${normalized}: ${err instanceof Error ? err.message : String(err)}`,
        );
        // Swallow — return canonical message regardless
      }
    }

    // Dev convenience: return raw token so we don't need a real inbox
    if (this.config.get<string>('app.nodeEnv') !== 'production' && rawToken) {
      return { __devToken: rawToken };
    }
    return {};
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: record.accountId },
        data: { passwordHash: newHash },
      });
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      await tx.refreshToken.updateMany({
        where: { accountId: record.accountId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }
}
