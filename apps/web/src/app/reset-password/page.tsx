'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword } from '@/lib/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Redirect to login after success
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      router.push('/login');
    }, 2500);
    return () => clearTimeout(timer);
  }, [success, router]);

  if (!token) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background px-4 overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,hsl(var(--primary)/0.12),transparent_60%)]" />
        <div className="relative w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-soft motion-fade-in text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Invalid reset link</h1>
          <p className="text-sm text-muted-foreground">
            This password reset link is missing or malformed.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block text-sm text-primary hover:underline"
          >
            Request a new link
          </Link>
        </div>
      </div>
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
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,hsl(var(--primary)/0.12),transparent_60%)]" />
      <div className="relative w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-soft motion-fade-in">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Set a new password</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Choose a strong password with at least 8 characters.
        </p>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-200">
              Password reset. Redirecting you to sign in…
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-muted-foreground">
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
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors duration-150"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-muted-foreground">
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
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors duration-150"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive space-y-1">
                <p>{error}</p>
                {error.toLowerCase().includes('expired') || error.toLowerCase().includes('invalid') ? (
                  <Link href="/forgot-password" className="underline hover:no-underline">
                    Request a new link
                  </Link>
                ) : null}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors duration-150 motion-press"
            >
              {loading ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
