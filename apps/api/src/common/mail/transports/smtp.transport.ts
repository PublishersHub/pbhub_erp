import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { MailMessage, MailTransport } from '../types';

interface SmtpConfig {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  secure: boolean;
}

export class SmtpMailTransport implements MailTransport {
  readonly name = 'smtp';
  private readonly logger = new Logger(SmtpMailTransport.name);
  private readonly transporter: Transporter;

  constructor(config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  async send(message: MailMessage & { from: string }): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: message.from,
        to: message.to,
        subject: message.subject,
        text: message.body,
        html: message.html,
      });
      this.logger.debug(`SMTP message sent: ${info.messageId}`);
    } catch (err) {
      this.logger.error(
        `SMTP send failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
