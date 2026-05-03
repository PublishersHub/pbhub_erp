/**
 * Logical scope of a stored object. Determines its key prefix and access policy.
 *
 *   private  → reachable only via short-lived signed URLs the API issues
 *   public   → readable by anyone with the URL (login-page branding)
 *   cache    → private + auto-expires after 30 days (e.g. generated payslip PDFs)
 */
export type StorageScope = 'private' | 'public' | 'cache';

export interface StorageObjectInput {
  /** Full object key, including its scope prefix (e.g. `private/receipts/...`). */
  key: string;
  body: Buffer;
  contentType: string;
}

export interface StorageObjectMeta {
  key: string;
  contentLength: number;
  contentType: string;
  lastModified: Date;
}

/**
 * Storage backend abstraction. `Local` writes to disk; `S3` talks to the bucket.
 */
export interface StorageService {
  /**
   * Persist the given bytes under `input.key`. Returns the canonical, internal
   * key (caller can store this in the DB).
   */
  put(input: StorageObjectInput): Promise<{ key: string }>;

  /**
   * Delete an object. No-op if it doesn't exist.
   */
  delete(key: string): Promise<void>;

  /**
   * Return a URL the browser can GET to download the object. For private keys
   * the URL is short-lived (signed). For public keys it's a stable URL.
   */
  getDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Return a stable public URL — only valid for keys under the `public/` prefix.
   * Throws for non-public keys.
   */
  getPublicUrl(key: string): string;

  /**
   * Whether an object with this key exists.
   */
  exists(key: string): Promise<boolean>;
}
