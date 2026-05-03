'use client';

import { useState } from 'react';

/**
 * Display avatar for an employee. Renders the photo if `imageUrl` is set,
 * otherwise falls back to gradient initials. The API serializes
 * `profileImageUrl` as a renderable URL (signed if needed) so callers
 * can pass it straight through.
 *
 * Sizes are deliberately limited to the ones the app actually uses
 * (32 for table rows, 40 for cards, 64 for detail headers, 96 for
 * the profile page) — keeps the component a single source of truth
 * for avatar sizing across the app.
 */

const GRADIENT_CLASSES = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-600',
  'from-teal-500 to-emerald-600',
  'from-fuchsia-500 to-violet-500',
];

function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return GRADIENT_CLASSES[hash % GRADIENT_CLASSES.length];
}

function initials(firstName: string | null | undefined, lastName: string | null | undefined): string {
  const f = (firstName ?? '').trim().charAt(0);
  const l = (lastName ?? '').trim().charAt(0);
  const result = `${f}${l}`.toUpperCase();
  return result || '?';
}

const SIZE_CLASSES: Record<number, { box: string; text: string }> = {
  32: { box: 'h-8 w-8', text: 'text-[10px]' },
  40: { box: 'h-10 w-10', text: 'text-xs' },
  64: { box: 'h-16 w-16', text: 'text-lg' },
  96: { box: 'h-24 w-24', text: 'text-2xl' },
};

export interface EmployeeAvatarProps {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  /** Pre-resolved URL (https://...) or null. The API enriches `profileImageUrl` already. */
  imageUrl?: string | null;
  /** Stable seed for the fallback gradient — usually the employee id. */
  seed: string;
  /** Pixel size; one of 32 / 40 / 64 / 96. Defaults to 40. */
  size?: 32 | 40 | 64 | 96;
  className?: string;
}

export function EmployeeAvatar({
  firstName,
  lastName,
  imageUrl,
  seed,
  size = 40,
  className = '',
}: EmployeeAvatarProps) {
  // Track image load failure so we fall back to initials if the signed URL
  // 403/404s (e.g. expired before the page rendered).
  const [imgFailed, setImgFailed] = useState(false);

  const sizeCls = SIZE_CLASSES[size];
  const gradient = gradientFor(seed);
  const showImage = !!imageUrl && !imgFailed;

  if (showImage) {
    return (
      <span
        className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border ${sizeCls.box} ${className}`}
      >
        {/* Plain <img> on purpose — `next/image` requires upfront domain config
            and our signed URLs are dynamic, so the simpler tag is the right fit. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl as string}
          alt={`${firstName ?? ''} ${lastName ?? ''}`.trim() || 'Profile photo'}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm ${gradient} ${sizeCls.box} ${sizeCls.text} ${className}`}
      aria-label={`${firstName ?? ''} ${lastName ?? ''}`.trim() || 'Avatar'}
    >
      {initials(firstName, lastName)}
    </span>
  );
}
