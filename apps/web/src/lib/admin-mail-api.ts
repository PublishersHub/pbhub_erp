import { post } from './api';

export type AdminMailRecipientType = 'all' | 'department' | 'specific';

export interface SendAdminMailPayload {
  recipientType: AdminMailRecipientType;
  departmentId?: string;
  employeeIds?: string[];
  subject: string;
  body: string;
  preheader?: string;
}

export interface SendAdminMailResult {
  sent: number;
  failed: number;
  total: number;
  messageId: string;
}

export function sendAdminMail(payload: SendAdminMailPayload) {
  return post<SendAdminMailResult>('/api/admin-mail/send', payload);
}
