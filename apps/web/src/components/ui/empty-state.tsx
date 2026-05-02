'use client';

import Link from 'next/link';

export type EmptyStateVariant =
  | 'default'
  | 'inbox'
  | 'leave'
  | 'expense'
  | 'attendance'
  | 'recruitment'
  | 'onboarding'
  | 'search';

export interface EmptyStateCta {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  variant?: EmptyStateVariant;
  cta?: EmptyStateCta;
}

interface VariantConfig {
  haloClass: string;
  iconBgClass: string;
  iconColorClass: string;
  icon: React.ReactNode;
}

const variantConfigs: Record<EmptyStateVariant, VariantConfig> = {
  default: {
    haloClass: 'bg-primary/30',
    iconBgClass: 'bg-primary/10',
    iconColorClass: 'text-primary',
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904l-4.905-4.905m8.41-2.41l-8.41 8.41m0 0l4.904 4.904m-4.904-4.904l4.904-4.904"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.812 7.812l4.905 4.905m0 0l-4.905 4.905m4.905-4.905l-4.905-4.905"
        />
      </svg>
    ),
  },
  inbox: {
    haloClass: 'bg-primary/30',
    iconBgClass: 'bg-primary/10',
    iconColorClass: 'text-primary',
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
    ),
  },
  leave: {
    haloClass: 'bg-violet/30',
    iconBgClass: 'bg-violet/10',
    iconColorClass: 'text-violet',
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 12c0-1.657.895-3.102 2.232-3.889M18 12c0 1.657-.895 3.102-2.232 3.889M9 9c.557-.174 1.158-.274 1.785-.274h2.43c.627 0 1.228.1 1.785.274m0 0C13.105 9.811 13.5 11.085 13.5 12.5c0 1.415-.395 2.689-1.095 3.811m0 0H8.595m5.41-7.622C15.896 7.811 16.5 6.485 16.5 5c0-1.933-1.567-3.5-3.5-3.5S9.5 3.067 9.5 5c0 1.485.604 2.811 1.595 3.811"
        />
      </svg>
    ),
  },
  expense: {
    haloClass: 'bg-pink/30',
    iconBgClass: 'bg-pink/10',
    iconColorClass: 'text-pink',
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  attendance: {
    haloClass: 'bg-success/30',
    iconBgClass: 'bg-success/10',
    iconColorClass: 'text-success',
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4l3 2m6-11a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  recruitment: {
    haloClass: 'bg-cyan/30',
    iconBgClass: 'bg-cyan/10',
    iconColorClass: 'text-cyan',
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 13.255A23.931 23.931 0 0112 15c-3.728 0-7.333-.889-10.408-2.45m20.908 0a23.931 23.931 0 01-7.674 2.45m0 0a23.631 23.631 0 01-7.674-2.45m0 0a3 3 0 11-6 0 3 3 0 016 0zm12 0a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  onboarding: {
    haloClass: 'bg-primary/30',
    iconBgClass: 'bg-primary/10',
    iconColorClass: 'text-primary',
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  search: {
    haloClass: 'bg-muted-foreground/20',
    iconBgClass: 'bg-secondary',
    iconColorClass: 'text-muted-foreground',
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
  },
};

export function EmptyState({
  title,
  description,
  variant = 'default',
  cta,
}: EmptyStateProps) {
  const config = variantConfigs[variant];

  return (
    <div className="motion-fade-in flex flex-col items-center justify-center px-6 py-12 text-center">
      {/* Icon medallion */}
      <div className="relative mb-5">
        {/* Soft glow halo behind */}
        <div
          aria-hidden
          className={`absolute inset-0 -z-10 scale-150 rounded-full ${config.haloClass} blur-2xl opacity-60`}
        />
        {/* Icon container */}
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-hairline ${config.iconBgClass} backdrop-blur shadow-soft`}
        >
          <div className={config.iconColorClass}>{config.icon}</div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold tracking-tight text-foreground">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {/* CTA Button */}
      {cta && (
        <div className="mt-5">
          {cta.href ? (
            <Link
              href={cta.href}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-glow-primary transition-all motion-press hover:bg-primary/90"
            >
              {cta.label}
            </Link>
          ) : cta.onClick ? (
            <button
              onClick={cta.onClick}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-glow-primary transition-all motion-press hover:bg-primary/90"
            >
              {cta.label}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
