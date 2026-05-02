export interface MailMessage {
  to: string | string[];
  subject: string;
  body: string; // plain text
  html?: string; // optional rich version
}

export interface MailTransport {
  send(message: MailMessage & { from: string }): Promise<void>;
  readonly name: string;
}
