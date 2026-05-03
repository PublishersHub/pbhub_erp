import { getToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type UploadPurpose =
  | 'expense-receipt'
  | 'profile-photo'
  | 'employee-doc'
  | 'onboarding-doc'
  | 'org-logo'
  | 'org-favicon'
  | 'org-login-bg';

export interface UploadResponse {
  /** Storage key — store this in the DB. */
  key: string;
  /** Currently-valid URL the browser can fetch. For private keys, expires; re-mint with `getDownloadUrl(key)`. */
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

export interface UploadContext {
  employeeId?: string;
  claimId?: string;
  instanceId?: string;
  taskId?: string;
}

/**
 * Upload a single file. Returns a storage key (persist in DB) and a renderable URL.
 *
 *   const { key, url } = await uploadFile(file, 'expense-receipt', { claimId });
 *   await updateExpenseItem(itemId, { receiptUrl: key });
 */
export async function uploadFile(
  file: File,
  purpose: UploadPurpose,
  context: UploadContext = {},
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('purpose', purpose);
  for (const [k, v] of Object.entries(context)) {
    if (v) formData.append(k, v);
  }

  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/api/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.message ?? `Upload failed (${res.status})`;
    throw new Error(Array.isArray(message) ? message.join('. ') : message);
  }

  return res.json();
}

/**
 * Mint a fresh download URL for a previously-stored key. Used when the DB has
 * just the key and you need a renderable URL right now (private files only).
 */
export async function getDownloadUrl(key: string): Promise<string> {
  const token = getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/uploads/url?key=${encodeURIComponent(key)}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Could not resolve URL (${res.status})`);
  }
  const data = await res.json();
  return data.url;
}

export async function deleteUpload(key: string): Promise<void> {
  const token = getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/uploads/${encodeURIComponent(key)}`,
    { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Delete failed (${res.status})`);
  }
}

/**
 * Render-time helper: if the value looks like a storage key, resolve to a URL.
 * If it's already an http(s) URL, return as-is. Useful for components that
 * accept either form.
 */
export async function resolveStorageUrl(keyOrUrl: string): Promise<string> {
  if (/^https?:\/\//.test(keyOrUrl)) return keyOrUrl;
  return getDownloadUrl(keyOrUrl);
}
