'use client';

import { useRef, useState } from 'react';
import { EmployeeAvatar, type EmployeeAvatarProps } from './employee-avatar';
import { uploadFile } from '@/lib/upload-api';

/**
 * Avatar with hover-overlay camera button + file picker.
 *
 * Owns the upload step (POST /api/uploads) but delegates persistence to the
 * caller via `onUploaded(key)` — the caller is responsible for PATCHing the
 * appropriate record (`/api/employees/me` for self, `/api/employees/:id` for
 * admin). On success/error it surfaces a toast through the supplied callbacks.
 *
 * Used on the profile page and the employee edit page; the read-only detail
 * card and list rows render `<EmployeeAvatar>` directly instead.
 */

export interface AvatarUploaderProps extends Omit<EmployeeAvatarProps, 'size'> {
  /** Employee id used to scope the storage key (uploads/policy context). */
  employeeId: string;
  /** Called after a successful upload with the new storage key. */
  onUploaded: (key: string) => Promise<void> | void;
  /** Toast hooks — kept generic so the parent's existing toast wiring is reused. */
  onError?: (message: string) => void;
  /** Disable the camera button (e.g. when the parent doesn't have permission). */
  disabled?: boolean;
}

export function AvatarUploader({
  employeeId,
  onUploaded,
  onError,
  disabled,
  ...avatarProps
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Always reset the input so the same file can be re-selected after a failure.
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const { key } = await uploadFile(file, 'profile-photo', { employeeId });
      await onUploaded(key);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      onError?.(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative inline-block">
      <EmployeeAvatar size={96} {...avatarProps} />

      {/* Spinner overlay during upload */}
      {uploading && (
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-[1px]">
          <svg
            className="h-8 w-8 animate-spin text-white"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path
              d="M22 12a10 10 0 0 1-10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}

      {/* Camera button — visible on hover/focus of the wrapper */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        aria-label="Change profile photo"
        className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-card transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
        </svg>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
