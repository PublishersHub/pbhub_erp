const TOKEN_KEY = 'hrms_access_token';
const REFRESH_KEY = 'hrms_refresh_token';
const ACTIVE_ORG_KEY = 'hrms_active_org_id';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_KEY, token);
}

export function getActiveOrgId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_ORG_KEY);
}

export function setActiveOrgId(orgId: string): void {
  localStorage.setItem(ACTIVE_ORG_KEY, orgId);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ACTIVE_ORG_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
