'use client';

import Link from 'next/link';

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  status?: number;
  fallback?: { label: string; href: string };
}

function is403(status?: number, message?: string): boolean {
  if (status === 403) return true;
  if (!status && message) {
    const lower = message.toLowerCase();
    return lower.includes('permission') || lower.includes('forbidden');
  }
  return false;
}

export function ErrorMessage({ message, onRetry, status, fallback }: ErrorMessageProps) {
  if (is403(status, message)) {
    return (
      <div className="rounded-lg border border-warning/20 bg-warning/15 px-5 py-5 motion-fade-in">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-warning">You don&apos;t have access</p>
            <p className="mt-1 text-sm text-warning/80">
              You don&apos;t have permission to view this. Ask your administrator if you need access.
            </p>
            {fallback && (
              <Link
                href={fallback.href}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-warning/20 px-3 py-1.5 text-sm font-medium text-warning transition-colors hover:bg-warning/30 motion-press"
              >
                {fallback.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-destructive/20 bg-destructive-soft px-4 py-4">
      <p className="text-sm text-destructive/90">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm font-medium text-destructive underline-offset-4 hover:underline hover:text-destructive/80 motion-press"
        >
          Try again
        </button>
      )}
    </div>
  );
}
