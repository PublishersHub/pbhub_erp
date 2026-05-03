'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
}

const variants = {
  primary: 'bg-primary text-primary-foreground shadow-glow-primary hover:bg-primary/90',
  secondary: 'border border-input bg-card text-foreground hover:bg-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  ghost: 'text-foreground hover:bg-muted',
};

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading, loadingText, children, disabled, variant = 'primary', className = '', ...rest }, ref) => {
    return (
      <button
        ref={ref}
        {...rest}
        disabled={loading || disabled}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold motion-press transition-all disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        {loading ? loadingText ?? children : children}
      </button>
    );
  }
);

LoadingButton.displayName = 'LoadingButton';
