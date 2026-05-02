'use client';

import { useState, useEffect, type FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getInvitationByToken,
  acceptInvitation,
  type InvitationContext,
} from '@/lib/invitations-api';
import { setToken, setRefreshToken, setActiveOrgId } from '@/lib/auth';
import { AuthBrandShell } from '@/components/auth-brand-shell';
import type { OrgBrandPublic } from '@/lib/branding-api';

// ─── Inner component (uses useSearchParams, so needs Suspense) ────────────────

function AcceptInvitationInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [context, setContext] = useState<InvitationContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // On mount, load invitation context
  useEffect(() => {
    if (!token) {
      setLoadError('No invitation token provided.');
      setLoading(false);
      return;
    }
    getInvitationByToken(token)
      .then(setContext)
      .catch(() => setLoadError('This invitation link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setSubmitError('Passwords do not match.');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await acceptInvitation({ token, password });

      // Store tokens
      setRefreshToken(res.refreshToken);

      if (res.accessToken && res.activeOrganizationId) {
        // Single-org: auto sign-in directly to dashboard
        setToken(res.accessToken);
        setActiveOrgId(res.activeOrganizationId);
        router.push('/dashboard');
      } else {
        // Multi-org account: go to org picker
        router.push('/select-organization');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to accept invitation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Build a synthetic OrgBrandPublic from the invitation context for the shell
  const branding: OrgBrandPublic | null = context
    ? {
        name: context.organizationName,
        slug: context.organizationSlug,
        brandName: context.organizationBrandName,
        brandLogoUrl: context.organizationBrandLogoUrl,
        brandPrimary: context.organizationBrandPrimary,
        brandTagline: context.organizationBrandTagline,
        brandFaviconUrl: context.organizationBrandFaviconUrl,
        brandLoginBg: context.organizationBrandLoginBg,
      }
    : null;

  const inputClass =
    'w-full rounded-md border border-input bg-card/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/15 transition-all duration-200 disabled:opacity-60';

  return (
    <AuthBrandShell branding={branding} loading={loading}>
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : loadError ? (
        /* Error state */
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-6 w-6 text-destructive">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Invitation not found</h2>
            <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
          </div>
          <Link
            href="/login"
            className="inline-block rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to login
          </Link>
        </div>
      ) : context ? (
        /* Accept form */
        <div className="space-y-5">
          <div className="-mt-4">
            <p className="text-base font-medium text-foreground">Accept your invitation</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You've been invited to join{' '}
              <span className="font-medium text-foreground">{context.organizationName}</span>.
            </p>
          </div>

          {/* Invitation context card */}
          <div className="space-y-1 rounded-lg border border-border bg-secondary/30 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              {context.firstName} {context.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{context.email}</p>
            <p className="text-xs text-muted-foreground">
              Expires{' '}
              {new Date(context.expiresAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Set your password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Confirm password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                className={inputClass}
              />
            </div>

            {submitError && (
              <p className="rounded-md bg-destructive-soft px-3.5 py-2.5 text-sm text-destructive">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="gradient-brand motion-press relative w-full overflow-hidden rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow-primary transition-all duration-200 hover:shadow-floating disabled:opacity-60"
            >
              <span className="relative z-10">{submitting ? 'Creating account…' : 'Accept invitation'}</span>
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      ) : null}
    </AuthBrandShell>
  );
}

// ─── Page (Suspense wrapper for useSearchParams) ──────────────────────────────

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      }
    >
      <AcceptInvitationInner />
    </Suspense>
  );
}
