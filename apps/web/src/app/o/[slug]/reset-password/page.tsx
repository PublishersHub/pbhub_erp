'use client';

import { useEffect, useState, type FormEvent, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { resetPassword } from '@/lib/api';
import { AuthBrandShell } from '@/components/auth-brand-shell';
import { getOrganizationBranding, type OrgBrandPublic } from '@/lib/branding-api';

// ─── Inner component (uses useSearchParams, needs Suspense) ──────────────────

function BrandedResetPasswordInner() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const token = searchParams.get('token');

  const [branding, setBranding] = useState<OrgBrandPublic | null>(null);
  const [brandingLoading, setBrandingLoading] = useState(true);
  const [brandingError, setBrandingError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBrandingLoading(true);
    getOrganizationBranding(slug)
      .then((b) => { if (!cancelled) setBranding(b); })
      .catch(() => { if (!cancelled) setBrandingError('Organization not found'); })
      .finally(() => { if (!cancelled) setBrandingLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  // Redirect to branded login after success
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      router.push(`/o/${slug}/login`);
    }, 2500);
    return () => clearTimeout(timer);
  }, [success, router, slug]);

  if (brandingError) {
    return (
      <AuthBrandShell branding={null}>
        <p className="text-sm text-destructive">{brandingError}</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Go to default sign in →
        </Link>
      </AuthBrandShell>
    );
  }

  if (!token) {
    return (
      <AuthBrandShell branding={branding} loading={brandingLoading}>
        <div className="-mt-4 space-y-4 text-center">
          <p className="text-base font-medium text-foreground">Invalid reset link</p>
          <p className="text-sm text-muted-foreground">
            This password reset link is missing or malformed.
          </p>
          <Link
            href={`/o/${slug}/forgot-password`}
            className="inline-block text-sm text-primary hover:underline"
          >
            Request a new link
          </Link>
        </div>
      </AuthBrandShell>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token!, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBrandShell branding={branding} loading={brandingLoading}>
      <div className="-mt-4 mb-6">
        <p className="text-base font-medium text-foreground">Set a new password</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a strong password with at least 8 characters.
        </p>
      </div>

      {success ? (
        <div className="space-y-4">
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
            Password reset. Redirecting you to sign in…
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-card/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/15 transition-all duration-200"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-card/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/15 transition-all duration-200"
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive-soft px-3.5 py-2.5 text-sm text-destructive space-y-1">
              <p>{error}</p>
              {error.toLowerCase().includes('expired') || error.toLowerCase().includes('invalid') ? (
                <Link href={`/o/${slug}/forgot-password`} className="underline hover:no-underline">
                  Request a new link
                </Link>
              ) : null}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="gradient-brand motion-press relative w-full overflow-hidden rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow-primary transition-all duration-200 hover:shadow-floating disabled:opacity-60"
          >
            <span className="relative z-10">{loading ? 'Saving…' : 'Reset password'}</span>
          </button>
        </form>
      )}
    </AuthBrandShell>
  );
}

// ─── Page (Suspense wrapper for useSearchParams) ──────────────────────────────

export default function BrandedResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      }
    >
      <BrandedResetPasswordInner />
    </Suspense>
  );
}
