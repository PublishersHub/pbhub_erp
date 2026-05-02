'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/toast';
import { usePermission } from '@/lib/hooks';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { updateBranding } from '@/lib/organizations-api';

// ─── Hex validation ───────────────────────────

function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

// ─── Preview helper ───────────────────────────

/** Crude lightness shift for the preview gradient — returns input on failure. */
function shiftHex(hex: string, dl: number): string {
  if (!isValidHex(hex)) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r + dl)}${toHex(g + dl)}${toHex(b + dl)}`;
}

// ─── Presets ──────────────────────────────────

const PRESETS = [
  { id: 'ocean',    name: 'Ocean',    primary: '#0284c7', tagline: 'Calm, deep, professional' },
  { id: 'forest',   name: 'Forest',   primary: '#16a34a', tagline: 'Grounded, sustainable' },
  { id: 'sunset',   name: 'Sunset',   primary: '#ea580c', tagline: 'Warm, energetic' },
  { id: 'midnight', name: 'Midnight', primary: '#7c3aed', tagline: 'Modern, premium' },
  { id: 'rose',     name: 'Rose',     primary: '#e11d48', tagline: 'Bold, distinctive' },
  { id: 'slate',    name: 'Slate',    primary: '#475569', tagline: 'Minimal, professional' },
  { id: 'teal',     name: 'Teal',     primary: '#0d9488', tagline: 'Fresh, balanced' },
  { id: 'indigo',   name: 'Indigo',   primary: '#4f46e5', tagline: 'Trustworthy, established' },
];

// ─── Live Preview ─────────────────────────────

function PreviewCard({
  name,
  logoUrl,
  primary,
  tagline,
  loginBg,
}: {
  name: string;
  logoUrl: string;
  primary: string;
  tagline: string;
  loginBg: string;
}) {
  const displayPrimary = isValidHex(primary) ? primary : '#3b82f6';

  return (
    <div className="surface-glass-card rounded-2xl border border-hairline p-5">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Preview
      </p>
      <div className="space-y-4">
        {/* Login background thumbnail */}
        {loginBg && (
          <div className="overflow-hidden rounded-xl border border-hairline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={loginBg}
              alt="Login background preview"
              className="h-16 w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Mock sidebar header */}
        <div className="flex items-center gap-3 rounded-xl border border-hairline bg-card/40 p-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logo preview"
              className="h-9 w-9 rounded-xl object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl shadow-glow-primary"
              style={{
                background: `linear-gradient(135deg, ${displayPrimary} 0%, ${shiftHex(displayPrimary, -30)} 100%)`,
              }}
            >
              <span className="text-sm font-bold text-white">
                {(name || 'PbHub').slice(0, 1)}
              </span>
            </div>
          )}
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-foreground">
              {name || 'PbHub HRMS'}
            </span>
            {tagline && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {tagline}
              </span>
            )}
          </div>
        </div>

        {/* Color swatch row */}
        <div className="flex items-center gap-2">
          <div
            className="h-5 w-5 rounded-md border border-hairline shadow-sm"
            style={{ backgroundColor: displayPrimary }}
          />
          <span className="font-mono text-xs text-muted-foreground">{displayPrimary}</span>
        </div>

        {/* Mock primary button */}
        <button
          type="button"
          style={{ backgroundColor: displayPrimary, color: 'white' }}
          className="motion-press rounded-xl px-3.5 py-2 text-sm font-semibold shadow-soft"
        >
          Primary action
        </button>

        {/* Mock link */}
        <a
          href="#"
          style={{ color: displayPrimary }}
          className="text-sm font-medium underline-offset-4 hover:underline"
          onClick={(e) => e.preventDefault()}
        >
          Example link
        </a>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────

export default function BrandingSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { can } = usePermission();
  const toast = useToast();
  const canManage = can('organization.manage');
  const org = user?.activeOrganization;

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primary, setPrimary] = useState('#3b82f6');
  const [hexInput, setHexInput] = useState('#3b82f6');
  const [tagline, setTagline] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [loginBg, setLoginBg] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!org) return;
    setName(org.brandName ?? '');
    setLogoUrl(org.brandLogoUrl ?? '');
    const color = org.brandPrimary ?? '#3b82f6';
    setPrimary(color);
    setHexInput(color);
    setTagline(org.brandTagline ?? '');
    setFaviconUrl(org.brandFaviconUrl ?? '');
    setLoginBg(org.brandLoginBg ?? '');
  }, [org?.id, org?.brandName, org?.brandLogoUrl, org?.brandPrimary, org?.brandTagline, org?.brandFaviconUrl, org?.brandLoginBg]);

  if (!canManage) {
    return (
      <div>
        <PageHeader
          title="Branding"
          description="Customize this organization's appearance."
        />
        <ErrorMessage
          message="You don't have permission to manage branding."
          status={403}
        />
      </div>
    );
  }

  function handleColorPickerChange(value: string) {
    setPrimary(value);
    setHexInput(value);
  }

  function handleHexInputChange(value: string) {
    setHexInput(value);
    // Only update the color picker (and live preview) once we have a valid 7-char hex
    if (isValidHex(value)) {
      setPrimary(value);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidHex(primary)) {
      setError('Primary color must be a valid hex color (e.g. #3b82f6).');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateBranding({
        brandName: name.trim() || null,
        brandLogoUrl: logoUrl.trim() || null,
        brandPrimary: primary || null,
        brandTagline: tagline.trim() || null,
        brandFaviconUrl: faviconUrl.trim() || null,
        brandLoginBg: loginBg.trim() || null,
      });
      toast.success('Branding updated', 'The new branding is live across the app.');
      await refreshUser();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save branding';
      setError(msg);
      toast.error('Failed to save', msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setError(null);
    try {
      await updateBranding({
        brandName: null,
        brandLogoUrl: null,
        brandPrimary: null,
        brandTagline: null,
        brandFaviconUrl: null,
        brandLoginBg: null,
      });
      toast.success('Branding reset to defaults');
      await refreshUser();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reset branding';
      setError(msg);
      toast.error('Failed to reset', msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Branding"
        description="Customize this organization's logo, name, and primary color across every screen."
        actions={
          <button
            type="button"
            onClick={handleReset}
            className="motion-press rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
            disabled={saving}
          >
            Reset to defaults
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="surface-elevated rounded-2xl border border-hairline p-6 shadow-soft space-y-5">
            {/* Brand name */}
            <div className="space-y-1.5">
              <label
                htmlFor="brand-name"
                className="block text-sm font-medium text-foreground"
              >
                Brand name
              </label>
              <input
                id="brand-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={org?.name ?? 'Acme Corp'}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
              <p className="text-xs text-muted-foreground">
                Shown in the sidebar and browser tab. Leave blank to use the organization name.
              </p>
            </div>

            {/* Logo URL */}
            <div className="space-y-1.5">
              <label
                htmlFor="logo-url"
                className="block text-sm font-medium text-foreground"
              >
                Logo URL
              </label>
              <input
                id="logo-url"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
              <p className="text-xs text-muted-foreground">
                Public URL to your logo image. Square works best (e.g., 200×200).
              </p>
            </div>

            {/* Quick presets */}
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-foreground">Quick presets</p>
                <p className="text-xs text-muted-foreground">Pick a starting point — you can fine-tune below.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRESETS.map((p) => {
                  const isMatch = primary.toLowerCase() === p.primary.toLowerCase();
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPrimary(p.primary);
                        setHexInput(p.primary);
                        if (!tagline.trim()) setTagline(p.tagline);
                      }}
                      className={`group relative overflow-hidden rounded-xl border p-3 text-left transition-all motion-press ${
                        isMatch
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-hairline hover:border-primary/40'
                      }`}
                      style={{ backgroundColor: p.primary + '08' }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-6 w-6 rounded-full ring-2 ring-white shadow-sm"
                          style={{ backgroundColor: p.primary }}
                        />
                        <span className="text-sm font-semibold text-foreground">{p.name}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary color */}
            <div className="space-y-1.5">
              <label
                htmlFor="hex-input"
                className="block text-sm font-medium text-foreground"
              >
                Primary color
              </label>
              <div className="flex items-center gap-2">
                {/* Color swatch / native color picker trigger */}
                <label
                  htmlFor="color-picker"
                  className="cursor-pointer rounded-md border border-input p-0.5 transition-opacity hover:opacity-80"
                  title="Open color picker"
                >
                  <div
                    className="h-8 w-8 rounded"
                    style={{ backgroundColor: isValidHex(primary) ? primary : '#3b82f6' }}
                  />
                  <input
                    id="color-picker"
                    type="color"
                    value={isValidHex(primary) ? primary : '#3b82f6'}
                    onChange={(e) => handleColorPickerChange(e.target.value)}
                    className="sr-only"
                  />
                </label>
                {/* Hex text input */}
                <input
                  id="hex-input"
                  type="text"
                  value={hexInput}
                  onChange={(e) => handleHexInputChange(e.target.value)}
                  placeholder="#3b82f6"
                  maxLength={7}
                  spellCheck={false}
                  className={`w-32 rounded-md border bg-card px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 ${
                    isValidHex(hexInput)
                      ? 'border-input focus:border-primary'
                      : 'border-destructive/60 focus:border-destructive focus:ring-destructive/30'
                  }`}
                />
                {!isValidHex(hexInput) && hexInput.length > 1 && (
                  <span className="text-xs text-destructive">Invalid hex</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Replaces the default violet across buttons, links, and accents.
              </p>
            </div>

            {/* Tagline */}
            <div className="space-y-1.5">
              <label
                htmlFor="tagline"
                className="block text-sm font-medium text-foreground"
              >
                Tagline
              </label>
              <input
                id="tagline"
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Your workforce, simplified."
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
              <p className="text-xs text-muted-foreground">
                Optional short subline under the brand name.
              </p>
            </div>

            {/* Favicon URL */}
            <div className="space-y-1.5">
              <label
                htmlFor="favicon-url"
                className="block text-sm font-medium text-foreground"
              >
                Favicon URL
              </label>
              <input
                id="favicon-url"
                type="url"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="https://example.com/favicon.png"
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
              <p className="text-xs text-muted-foreground">
                Public URL to your favicon (32×32 or 64×64 PNG/ICO recommended).
              </p>
            </div>

            {/* Login background image */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-bg"
                className="block text-sm font-medium text-foreground"
              >
                Login background image
              </label>
              <input
                id="login-bg"
                type="url"
                value={loginBg}
                onChange={(e) => setLoginBg(e.target.value)}
                placeholder="https://example.com/background.jpg"
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
              <p className="text-xs text-muted-foreground">
                Optional. Public URL to the image shown behind the sign-in form. Landscape works best.
              </p>
            </div>
          </div>

          {error && <ErrorMessage message={error} />}

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={saving}
              className="motion-press rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>

        {/* ── Live Preview ── */}
        <div className="self-start">
          <PreviewCard
            name={name}
            logoUrl={logoUrl}
            primary={primary}
            tagline={tagline}
            loginBg={loginBg}
          />
        </div>
      </div>
    </div>
  );
}
