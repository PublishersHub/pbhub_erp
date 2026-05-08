import { Logger } from '@nestjs/common';
import type { MailMessage, MailTransport } from '../types';

export class ConsoleMailTransport implements MailTransport {
  readonly name = 'console';
  private readonly logger = new Logger(ConsoleMailTransport.name);

  async send(message: MailMessage & { from: string }): Promise<void> {
    const recipients = Array.isArray(message.to)
      ? message.to.join(', ')
      : message.to;
    const attachmentsLine =
      message.attachments && message.attachments.length > 0
        ? `\n  Attachments: ${message.attachments
            .map((a) => `${a.filename} (${a.content.length} bytes)`)
            .join(', ')}`
        : '';
    this.logger.log(
      `[EMAIL] ${message.from} -> ${recipients}\n  Subject: ${message.subject}\n  Body: ${message.body}${attachmentsLine}`,
    );
  }
}
