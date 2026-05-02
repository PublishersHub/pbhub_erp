import { get, post } from './api';
import type { LoginResponse } from './api';

export interface Invitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  invitedByUser?: {
    id: string;
    account: { firstName: string; lastName: string; email: string };
  } | null;
  roleAssignments: Array<{ role: { id: string; name: string; slug: string } }>;
}

export interface CreatedInvitation extends Invitation {
  inviteLink: string;
  rawToken: string;
}

export interface InvitationContext {
  email: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  organizationSlug: string;
  organizationBrandName: string | null;
  organizationBrandLogoUrl: string | null;
  organizationBrandPrimary: string | null;
  organizationBrandTagline: string | null;
  organizationBrandFaviconUrl: string | null;
  organizationBrandLoginBg: string | null;
  expiresAt: string;
}

export function listInvitations(status?: string) {
  return get<Invitation[]>(`/api/invitations${status ? `?status=${status}` : ''}`);
}

export function createInvitation(payload: {
  email: string;
  firstName: string;
  lastName: string;
  roleIds: string[];
}) {
  return post<CreatedInvitation>('/api/invitations', payload);
}

export function revokeInvitation(id: string) {
  return post<{ message: string }>(`/api/invitations/${id}/revoke`, {});
}

export function getInvitationByToken(token: string) {
  return get<InvitationContext>(
    `/api/invitations/by-token/${encodeURIComponent(token)}`,
    { skipAuth: true },
  );
}

export function acceptInvitation(payload: {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
}) {
  return post<LoginResponse>('/api/invitations/accept', payload, {
    skipAuth: true,
  });
}
