import { API_BASE_URL } from './utils';
import {
  getToken,
  setToken,
  getRefreshToken,
  setRefreshToken,
  getActiveOrgId,
  setActiveOrgId,
  clearTokens,
} from './auth';

// ─── Types ───────────────────────────────────

export interface ApiError extends Error {
  status: number;
}

export interface AccountProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Membership {
  userId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  roles: string[];
}

export interface ActiveUser {
  id: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
}

export interface AuthUser {
  account: AccountProfile;
  activeOrganizationId: string | null;
  user: ActiveUser | null;
  memberships: Membership[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken?: string;
  refreshToken: string;
  account: AccountProfile;
  memberships: Membership[];
  activeOrganizationId?: string;
  user?: ActiveUser;
}

export interface SelectOrganizationResponse {
  accessToken: string;
  activeOrganizationId: string;
  memberships: Membership[];
  user: ActiveUser;
}

// ─── Silent refresh ──────────────────────────

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;

  if (refreshPromise) return refreshPromise;

  const orgId = getActiveOrgId();

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: rt,
          ...(orgId ? { organizationId: orgId } : {}),
        }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as SelectOrganizationResponse & { refreshToken: string };
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setActiveOrgId(data.activeOrganizationId);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function forceLogout(): never {
  clearTokens();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
  throw new Error('Session expired. Please log in again.');
}

// ─── Core request ────────────────────────────

interface RequestOptions {
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const token = options?.skipAuth ? null : getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !options?.skipAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = getToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
      }
      res = await fetch(`${API_BASE_URL}${url}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    }
    if (res.status === 401) {
      forceLogout();
    }
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    let message: string;
    if (errBody?.message) {
      message = Array.isArray(errBody.message) ? errBody.message.join('. ') : errBody.message;
    } else if (res.status === 403) {
      message = 'You do not have permission to access this resource';
    } else if (res.status === 404) {
      message = 'The requested resource was not found';
    } else {
      message = `Request failed (${res.status})`;
    }
    const err = new Error(message);
    (err as ApiError).status = res.status;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── HTTP methods ────────────────────────────

export function get<T>(url: string, options?: RequestOptions) {
  return request<T>('GET', url, undefined, options);
}

export function post<T>(url: string, body?: unknown, options?: RequestOptions) {
  return request<T>('POST', url, body, options);
}

export function patch<T>(url: string, body?: unknown, options?: RequestOptions) {
  return request<T>('PATCH', url, body, options);
}

export function put<T>(url: string, body?: unknown, options?: RequestOptions) {
  return request<T>('PUT', url, body, options);
}

export function del<T>(url: string, options?: RequestOptions) {
  return request<T>('DELETE', url, undefined, options);
}

// ─── Auth endpoints ──────────────────────────

export function login(payload: LoginPayload) {
  return post<LoginResponse>('/api/auth/login', payload, { skipAuth: true });
}

export function selectOrganization(organizationId: string, refreshToken: string) {
  return post<SelectOrganizationResponse>(
    '/api/auth/select-organization',
    { organizationId, refreshToken },
    { skipAuth: true },
  );
}

export function switchOrganization(organizationId: string) {
  return post<SelectOrganizationResponse>(
    `/api/auth/switch-organization/${organizationId}`,
  );
}

export function logout(refreshToken: string) {
  return post<{ message: string }>('/api/auth/logout', { refreshToken });
}

export function fetchMe() {
  return get<AuthUser>('/api/auth/me');
}
