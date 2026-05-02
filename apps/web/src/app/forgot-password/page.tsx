'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { forgotPassword } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,hsl(var(--primary)/0.12),transparent_60%)]" />
      <div className="relative w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-soft motion-fade-in">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Reset your password</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Enter your email and we'll send you a link to reset your password.
        </p>

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-200">
              If that email is registered, a reset link has been sent. Check your inbox.
            </div>

            {devToken && (
              <div className="rounded-md border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 space-y-2">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                  Dev shortcut (non-production only)
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 break-all">
                  <Link
                    href={`/reset-password?token=${devToken}`}
                    className="underline hover:no-underline"
                  >
                    /reset-password?token={devToken}
                  </Link>
                </p>
              </div>
            )}

            <Link
              href="/login"
              className="block text-center text-sm text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-muted-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors duration-150"
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors duration-150 motion-press"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
