'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  reset = () => {
    this.setState((s) => ({ hasError: false, error: null, resetKey: s.resetKey + 1 }));
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, reset: this.reset });
      }
      return <DefaultFallback error={this.state.error} reset={this.reset} />;
    }
    // Re-mount children on reset by keying
    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="surface-glass-card relative w-full max-w-md overflow-hidden rounded-2xl border-hairline p-6 shadow-floating motion-fade-in">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Something went wrong</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The page hit an unexpected error. You can try again, or head back to the dashboard.
        </p>
        <pre className="mt-3 max-h-32 overflow-auto rounded-lg border border-hairline bg-card/40 p-3 text-xs text-destructive whitespace-pre-wrap">
{error.message}
        </pre>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="motion-press rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-glow-primary transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="motion-press rounded-xl border border-hairline bg-card/40 px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
