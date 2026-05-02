'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { forgotPassword } from '@/lib/api';
import { AuthBrandShell } from '@/components/auth-brand-shell';
import { getOrganizationBranding, type OrgBrandPublic } from '@/lib/branding-api';

export default function BrandedForgotPasswordPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [branding, setBranding] = useState<OrgBrandPublic | null>(null);
  const [brandingLoading, setBrandingLoading] = useState(true);
  const [brandingError, setBrandingError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBrandingLoading(true);
    getOrganizationBranding(slug)
      .then((b) => { if (!cancelled) setBranding(b); })
      .catch(() => { if (!cancelled) setBrandingError('Organization not found'); })
      .finally(() => { if (!cancelled) setBrandingLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setSubmitted(true);
      if (res.__devToken) {
        setDevToken(res.__devToken);
      }
    } catch {
      // Still show success to not leak whether the email exists
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <AuthBrandShell branding={branding} loading={brandingLoading}>
      <div className="-mt-4 mb-6">
        <p className="text-base font-medium text-foreground">Reset your password</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we'll send you a link to reset your password.
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4">
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
            If that email is registered, a reset link has been sent. Check your inbox.
          </div>

          {devToken && (
            <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                Dev shortcut (non-production only)
              </p>
              <p className="break-all text-xs text-amber-700 dark:text-amber-400">
                <Link
                  href={`/o/${slug}/reset-password?token=${devToken}`}
                  className="underline hover:no-underline"
                >
                  /o/{slug}/reset-password?token={devToken}
                </Link>
              </p>
            </div>
          )}

          <Link
            href={`/o/${slug}/login`}
            className="block text-center text-sm text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-md border border-input bg-card/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/15 transition-all duration-200"
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive-soft px-3.5 py-2.5 text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="gradient-brand motion-press relative w-full overflow-hidden rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow-primary transition-all duration-200 hover:shadow-floating disabled:opacity-60"
          >
            <span className="relative z-10">{loading ? 'Sending…' : 'Send reset link'}</span>
          </button>

          <Link
            href={`/o/${slug}/login`}
            className="block text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to sign in
          </Link>
        </form>
      )}
    </AuthBrandShell>
  );
}
