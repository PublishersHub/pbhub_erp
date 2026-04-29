import { API_BASE_URL } from './utils';
import {
  getToken,
  setToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
} from './auth';

// ─── Types ───────────────────────────────────

export interface ApiError extends Error {
  status: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
}

export interface LoginPayload {
  organizationSlug: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ─── Silent refresh ──────────────────────────

let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Deduplicates concurrent calls — only one refresh request is in-flight at a time.
 * Returns true if the token was refreshed, false otherwise.
 */
async function tryRefreshToken(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;

  // Deduplicate: if a refresh is already in flight, wait for it
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) return false;
      const data: LoginResponse = await res.json();
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
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
  skipAuth?: boolean; // used for login/refresh to avoid attaching token
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

  // On 401, attempt silent refresh then retry once
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
    // If still 401 after refresh attempt, force logout
    if (res.status === 401) {
      forceLogout();
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    let message: string;

    if (body?.message) {
      // NestJS validation returns { message: string[] } for 400
      message = Array.isArray(body.message) ? body.message.join('. ') : body.message;
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

export function fetchMe() {
  return get<AuthUser>('/api/auth/me');
}
