'use client';

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';

interface Brand {
  name: string;
  logoUrl: string | null;
  primaryHex: string | null;
  tagline: string | null;
  faviconUrl: string | null;
  loginBg: string | null;
}

const DEFAULT_BRAND: Brand = {
  name: 'PbHub HRMS',
  logoUrl: null,
  primaryHex: null,
  tagline: null,
  faviconUrl: null,
  loginBg: null,
};

const BrandingContext = createContext<Brand>(DEFAULT_BRAND);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const org = user?.activeOrganization ?? null;

  const brand = useMemo<Brand>(() => {
    if (!org) return DEFAULT_BRAND;
    return {
      name: (org.brandName && org.brandName.trim()) || org.name || 'PbHub HRMS',
      logoUrl: org.brandLogoUrl || null,
      primaryHex: org.brandPrimary || null,
      tagline: org.brandTagline || null,
      faviconUrl: org.brandFaviconUrl || null,
      loginBg: org.brandLoginBg || null,
    };
  }, [org]);

  // Inject --primary HSL override
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (brand.primaryHex) {
      const hsl = hexToHsl(brand.primaryHex);
      if (hsl) {
        root.style.setProperty('--primary', hsl);
        root.style.setProperty('--ring', hsl);
      }
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
    }
    return () => {
      // Don't reset on unmount — let the next provider apply
    };
  }, [brand.primaryHex]);

  // Update <title>
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = brand.name;
  }, [brand.name]);

  // Update <link rel="icon">
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const url = brand.faviconUrl;
    if (!url) {
      const existing = document.querySelector('link[rel="icon"][data-brand="org"]') as HTMLLinkElement | null;
      if (existing) existing.remove();
      return;
    }
    let link = document.querySelector('link[rel="icon"][data-brand="org"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.dataset.brand = 'org';
      document.head.appendChild(link);
    }
    link.href = url;
  }, [brand.faviconUrl]);

  return <BrandingContext.Provider value={brand}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}

// hex -> "H S% L%"
function hexToHsl(hex: string): string | null {
  const trimmed = hex.replace('#', '').trim();
  let r: number, g: number, b: number;
  if (trimmed.length === 3) {
    r = parseInt(trimmed[0] + trimmed[0], 16);
    g = parseInt(trimmed[1] + trimmed[1], 16);
    b = parseInt(trimmed[2] + trimmed[2], 16);
  } else if (trimmed.length === 6) {
    r = parseInt(trimmed.slice(0, 2), 16);
    g = parseInt(trimmed.slice(2, 4), 16);
    b = parseInt(trimmed.slice(4, 6), 16);
  } else {
    return null;
  }
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
