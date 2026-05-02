'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { AuthBrandShell } from '@/components/auth-brand-shell';
import { getOrganizationBranding, type OrgBrandPublic } from '@/lib/branding-api';

export default function BrandedLoginPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { login } = useAuth();
  const slug = params.slug;

  const [branding, setBranding] = useState<OrgBrandPublic | null>(null);
  const [brandingLoading, setBrandingLoading] = useState(true);
  const [brandingError, setBrandingError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    setSubmitting(true);
    try {
      const result = await login({ email, password });
      if (result === 'needs_org_selection') {
        router.push('/select-organization');
      }
      // 'authenticated' branch routes itself in the context to /dashboard
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
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
      <p className="-mt-4 mb-6 text-sm text-muted-foreground">
        Sign in to your account to continue
      </p>
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
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Password
            </label>
            <Link href={`/o/${slug}/forgot-password`} className="text-xs font-medium text-primary hover:underline">
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-md border border-input bg-card/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/15 transition-all duration-200"
          />
        </div>
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive-soft px-3.5 py-2.5 text-sm text-destructive motion-fade-in">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="gradient-brand motion-press relative w-full overflow-hidden rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow-primary transition-all duration-200 hover:shadow-floating disabled:opacity-60"
        >
          <span className="relative z-10">{submitting ? 'Signing in…' : 'Sign in'}</span>
        </button>
      </form>
    </AuthBrandShell>
  );
}
