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

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors duration-150 disabled:opacity-60';

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 overflow-hidden">
      {/* Aurora background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[40rem] w-[50rem] rounded-full bg-primary/12 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[30rem] w-[30rem] rounded-full bg-violet/8 blur-[120px]" />
        <div className="absolute top-1/3 right-0 h-[25rem] w-[25rem] rounded-full bg-pink/6 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md motion-fade-in">
        {/* Brand header */}
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="gradient-brand flex h-9 w-9 items-center justify-center rounded-xl shadow-glow-primary">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.4} stroke="white" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 11a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
          </div>
          <span className="text-xl font-bold">
            <span className="text-gradient-brand">PbHub</span>
            <span className="ml-1 text-foreground">HRMS</span>
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 shadow-soft">
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
                className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Go to login
              </Link>
            </div>
          ) : context ? (
            /* Accept form */
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-foreground">Accept your invitation</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  You've been invited to join{' '}
                  <span className="font-medium text-foreground">{context.organizationName}</span>.
                </p>
              </div>

              {/* Invitation context card */}
              <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 space-y-1">
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
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
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
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
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
                  <p className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors motion-press"
                >
                  {submitting ? 'Creating account…' : 'Accept invitation'}
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
        </div>
      </div>
    </div>
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
