'use client';

import { useEffect } from 'react';
import { useBranding } from '@/components/branding-provider';

/**
 * Set the browser tab title with the active org brand name as suffix.
 * Falls back to "HR System" if branding has not loaded yet.
 */
export function useDocumentTitle(pageName: string) {
  const branding = useBranding();
  const brandName = branding?.name ?? 'HR System';
  useEffect(() => {
    document.title = `${pageName} · ${brandName}`;
  }, [pageName, brandName]);
}
