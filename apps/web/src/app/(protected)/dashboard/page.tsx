'use client';

import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/lib/hooks';
import { getDashboardSummary } from '@/lib/recruitment-api';
import { formatDate, formatDateTime, formatCurrency, employeeName } from '@/lib/format';
import { StatusBadge } from '@/components/ui/status-badge';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import type { ApplicationStatus } from '@/types/recruitment';

// ─── Helper components ─────────────────

function KpiCard({
  label,
  value,
  href,
  accent = 'primary',
  icon,
}: {
  label: string;
  value: number | string;
  href: string;
  accent?: 'primary' | 'violet' | 'pink' | 'cyan';
  icon: JSX.Element;
}) {
  const accentClass = {
    primary: 'from-primary/30 to-primary/0',
    violet: 'from-violet/30 to-violet/0',
    pink: 'from-pink/30 to-pink/0',
    cyan: 'from-cyan/30 to-cyan/0',
  }[accent];
  const iconBg = {
    primary: 'bg-primary/15 text-primary',
    violet: 'bg-violet/15 text-violet',
    pink: 'bg-pink/15 text-pink',
    cyan: 'bg-cyan/15 text-cyan',
  }[accent];

  return (
    <Link
      href={href}
      className="surface-elevated motion-lift relative overflow-hidden rounded-2xl border border-hairline p-5 transition-all duration-300 hover:border-primary/30"
    >
      {/* corner glow */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${accentClass} blur-2xl`}
      />
      <div className="relative flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
      </div>
    </Link>
  );
}

function PipelineBar({
  label,
  count,
  max,
}: {
  label: string;
  count: number;
  max: number;
}) {
  const pct = max > 0 ? Math.max(2, (count / max) * 100) : 2;
  return (
    <div className="flex items-center gap-4 py-1.5">
      <span className="w-36 shrink-0 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label.replace(/_/g, ' ')}
      </span>
      <div className="relative flex-1 overflow-hidden rounded-full bg-secondary/60 ring-1 ring-inset ring-border/40">
        <div
          className="gradient-brand h-2.5 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-sm font-semibold text-foreground tabular-nums">{count}</span>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  viewAllHref,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  viewAllHref?: string;
}) {
  return (
    <div className="surface-glass-card rounded-2xl border border-hairline p-5 shadow-soft">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="group inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            View all
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-3 w-3 transition-transform group-hover:translate-x-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

const PIPELINE_STATUSES: { status: ApplicationStatus }[] = [
  { status: 'APPLIED' },
  { status: 'IN_PROGRESS' },
  { status: 'OFFER_EXTENDED' },
  { status: 'ON_HOLD' },
  { status: 'HIRED' },
  { status: 'REJECTED' },
  { status: 'WITHDRAWN' },
];

// ─── KPI icons ────────────────────

const Icons = {
  Users: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  Inbox: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
    </svg>
  ),
  Calendar: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  Document: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  Sparkles: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
};

// ─── Main component ─────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, error, loading, refetch } = useAsync(() => getDashboardSummary());

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!data) return null;

  const pipelineCounts = PIPELINE_STATUSES.map(({ status }) => ({
    status,
    count: data.pipeline[status] ?? 0,
  }));
  const maxPipelineCount = Math.max(...pipelineCounts.map((p) => p.count), 1);
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="motion-fade-in space-y-6">
      {/* Hero greeting */}
      <header className="aurora-tight relative overflow-hidden rounded-2xl border border-hairline bg-card/40 p-6 backdrop-blur">
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {today}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            Welcome back,{' '}
            <span className="text-gradient-brand">{user?.account?.firstName ?? 'there'}</span>
            <span className="text-foreground">.</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Here's what's happening across hiring today.
          </p>
        </div>
      </header>

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Total Candidates"
          value={data.totalCandidates}
          href="/recruitment/candidates"
          accent="primary"
          icon={Icons.Users}
        />
        <KpiCard
          label="Active Applications"
          value={data.activeApplications}
          href="/recruitment/applications"
          accent="violet"
          icon={Icons.Inbox}
        />
        <KpiCard
          label="Interviews"
          value={data.interviewsScheduled}
          href="/recruitment/interviews"
          accent="cyan"
          icon={Icons.Calendar}
        />
        <KpiCard
          label="Offers Extended"
          value={data.offersExtended}
          href="/recruitment/offers"
          accent="pink"
          icon={Icons.Document}
        />
        <KpiCard
          label="Hires This Month"
          value={data.hiresThisMonth}
          href="/recruitment/applications"
          accent="primary"
          icon={Icons.Sparkles}
        />
      </div>

      {/* Pipeline */}
      <SectionCard
        title="Pipeline overview"
        subtitle="Distribution of applications across stages"
        viewAllHref="/recruitment/applications"
      >
        {pipelineCounts.every((p) => p.count === 0) ? (
          <EmptyState title="No applications yet" description="Applications will appear here as candidates apply." />
        ) : (
          <div className="space-y-1">
            {pipelineCounts.map((p) => (
              <PipelineBar key={p.status} label={p.status} count={p.count} max={maxPipelineCount} />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Recent applications & upcoming interviews */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Recent applications"
          subtitle="Latest candidate submissions"
          viewAllHref="/recruitment/applications"
        >
          {data.recentApplications.length === 0 ? (
            <EmptyState title="No applications" description="New applications will show up here." />
          ) : (
            <div className="-mx-2 space-y-1">
              {data.recentApplications.map((app) => (
                <Link
                  key={app.id}
                  href={`/recruitment/applications/${app.id}`}
                  className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="gradient-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white shadow-sm">
                      {(app.candidate?.firstName?.[0] ?? '?') + (app.candidate?.lastName?.[0] ?? '')}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {employeeName(app.candidate)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {app.jobRequisition?.title ?? '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-xs text-muted-foreground/70 sm:inline">
                      {formatDate(app.appliedAt)}
                    </span>
                    <StatusBadge status={app.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Upcoming interviews"
          subtitle="Scheduled across the team"
        >
          {data.upcomingInterviews.length === 0 ? (
            <EmptyState title="No upcoming interviews" description="Scheduled interviews will appear here." />
          ) : (
            <div className="-mx-2 space-y-1">
              {data.upcomingInterviews.map((iv) => (
                <Link
                  key={iv.id}
                  href={`/recruitment/applications/${iv.applicationId}`}
                  className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan/15 text-cyan">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {employeeName(iv.application.candidate)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {iv.type.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-xs text-muted-foreground/70 sm:inline">
                      {formatDateTime(iv.scheduledAt)}
                    </span>
                    <StatusBadge status={iv.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Recent offers */}
      <SectionCard
        title="Recent offers"
        subtitle="Latest offers extended"
        viewAllHref="/recruitment/offers"
      >
        {data.recentOffers.length === 0 ? (
          <EmptyState title="No offers yet" description="Offers will appear here once created." />
        ) : (
          <div className="-mx-2 space-y-1">
            {data.recentOffers.map((o) => (
              <Link
                key={o.id}
                href={`/recruitment/applications/${o.applicationId}`}
                className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pink/15 text-pink">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{o.offerNumber}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {employeeName(o.application.candidate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-sm font-semibold text-foreground tabular-nums sm:inline">
                    {formatCurrency(o.baseSalary)}
                  </span>
                  <StatusBadge status={o.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
