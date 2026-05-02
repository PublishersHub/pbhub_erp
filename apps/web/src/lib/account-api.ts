import { get, patch, post } from './api';

export interface AccountProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  lastLoginAt: string | null;
  isActive: boolean;
}

export interface UpdateAccountPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export function getMyAccount() {
  return get<AccountProfile>('/api/account/me');
}

export function updateMyAccount(payload: UpdateAccountPayload) {
  return patch<AccountProfile>('/api/account/me', payload);
}

export function changeMyPassword(payload: ChangePasswordPayload) {
  return post<{ message: string }>('/api/account/me/password', payload);
}
