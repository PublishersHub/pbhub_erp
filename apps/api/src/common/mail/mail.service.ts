import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsoleMailTransport } from './transports/console.transport';
import { SmtpMailTransport } from './transports/smtp.transport';
import type { MailMessage, MailTransport } from './types';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transport: MailTransport;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const which = config.get<string>('app.mail.transport') ?? 'console';
    this.from =
      config.get<string>('app.mail.from') ??
      'PbHub HRMS <noreply@pbhub.local>';

    if (which === 'smtp') {
      this.transport = new SmtpMailTransport({
        host: config.get<string>('app.mail.smtp.host')!,
        port: config.get<number>('app.mail.smtp.port') ?? 587,
        user: config.get<string>('app.mail.smtp.user'),
        pass: config.get<string>('app.mail.smtp.password'),
        secure: config.get<boolean>('app.mail.smtp.secure') ?? false,
      });
    } else {
      this.transport = new ConsoleMailTransport();
    }

    this.logger.log(`MailerService using transport: ${this.transport.name}`);
  }

  /** Fire-and-forget — never throws upstream. Logs failures. */
  async send(message: MailMessage): Promise<void> {
    try {
      await this.transport.send({ ...message, from: this.from });
    } catch (err) {
      this.logger.error(
        `Mail send failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
