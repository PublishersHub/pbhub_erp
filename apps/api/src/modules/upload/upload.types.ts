/**
 * What a file is being uploaded for. Drives:
 *   - the storage key prefix (`private/` vs `public/`)
 *   - the permission gate
 *   - allowed content types and max size
 */
export type UploadPurpose =
  | 'expense-receipt'
  | 'profile-photo'
  | 'employee-doc'
  | 'onboarding-doc'
  | 'org-logo'
  | 'org-favicon'
  | 'org-login-bg';

export interface UploadResponse {
  /** The internal storage key — store this in your DB. */
  key: string;
  /** A URL the browser can use right now to render/download the file. */
  url: string;
  /** Original filename, sanitized. */
  filename: string;
  /** Bytes. */
  size: number;
  /** MIME type. */
  contentType: string;
}

export interface UploadPolicy {
  /** Allowed MIME types (regex patterns). */
  allowedContentTypes: RegExp[];
  /** Max size in bytes. */
  maxBytes: number;
  /** Whether the resulting object lives under public/ (anyone can read). */
  isPublic: boolean;
  /** Required permission code(s) to perform this upload (any-of semantics). */
  requiredPermissions: string[];
}
