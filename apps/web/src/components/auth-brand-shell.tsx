'use client';

import type { ReactNode } from 'react';
import type { OrgBrandPublic } from '@/lib/branding-api';

export function AuthBrandShell({
  branding,
  children,
  loading,
}: {
  branding: OrgBrandPublic | null;
  children: ReactNode;
  loading?: boolean;
}) {
  const hsl = branding?.brandPrimary ? hexToHsl(branding.brandPrimary) : null;
  const styleVars = hsl
    ? ({ ['--primary' as any]: hsl, ['--ring' as any]: hsl } as React.CSSProperties)
    : undefined;

  const name = branding?.brandName?.trim() || branding?.name || 'PbHub HRMS';
  const bgUrl = branding?.brandLoginBg ?? null;

  return (
    <div className="aurora relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {bgUrl && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center"
            style={{ backgroundImage: `url(${bgUrl})` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-background/70 backdrop-blur-sm"
          />
        </>
      )}
      <div className="motion-scale-in relative w-full max-w-md" style={styleVars}>
        <div className="surface-glass relative overflow-hidden rounded-2xl border-hairline p-8 shadow-floating">
          <div className="mb-8 flex flex-col items-start gap-3">
            {branding?.brandLogoUrl ? (
              <img
                src={branding.brandLogoUrl}
                alt={name}
                className="h-11 w-11 rounded-xl object-cover shadow-glow-primary"
              />
            ) : (
              <div className="gradient-brand flex h-11 w-11 items-center justify-center rounded-xl shadow-glow-primary">
                <span className="text-lg font-bold text-white">{name.slice(0, 1)}</span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {loading ? 'Loading…' : name}
              </h1>
              {branding?.brandTagline && (
                <p className="mt-1 text-sm text-muted-foreground">{branding.brandTagline}</p>
              )}
            </div>
          </div>
          {children}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 left-1/2 -z-10 h-32 w-3/4 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl"
        />
      </div>
    </div>
  );
}

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
  } else return null;
  if ([r, g, b].some(Number.isNaN)) return null;
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
