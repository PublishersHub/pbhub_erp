'use client';

import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/lib/hooks';
import { getDashboardSummary } from '@/lib/recruitment-api';
import { formatDate, formatDateTime, formatCurrency, employeeName } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import type { ApplicationStatus } from '@/types/recruitment';

// ─── Local helper components ─────────────────

function KpiCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="surface-elevated motion-lift cursor-pointer rounded-lg border border-border p-5 transition-colors hover:border-primary/40"
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
    </Link>
  );
}

function PipelineBar({ label, count, max }: { label: string; count: number; max: number }) {
  const width = max > 0 ? Math.max(2, (count / max) * 100) : 2;
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="w-32 shrink-0 text-right text-sm text-muted-foreground">{label.replace(/_/g, ' ')}</span>
      <div className="flex-1 rounded bg-secondary">
        <div className="h-6 rounded bg-primary transition-all duration-500" style={{ width: `${width}%` }} />
      </div>
      <span className="w-8 text-sm font-medium text-foreground/80">{count}</span>
    </div>
  );
}

function SectionCard({ title, children, viewAllHref }: { title: string; children: React.ReactNode; viewAllHref?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-sm text-primary hover:text-primary/80">
            View all
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Pipeline config ─────────────────────────

const PIPELINE_STATUSES: { status: ApplicationStatus }[] = [
  { status: 'APPLIED' },
  { status: 'IN_PROGRESS' },
  { status: 'OFFER_EXTENDED' },
  { status: 'ON_HOLD' },
  { status: 'HIRED' },
  { status: 'REJECTED' },
  { status: 'WITHDRAWN' },
];

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

  return (
    <div className="motion-fade-in">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.account?.firstName ?? 'User'}`}
      />

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Total Candidates" value={data.totalCandidates} href="/candidates" />
        <KpiCard label="Active Applications" value={data.activeApplications} href="/applications" />
        <KpiCard label="Interviews Scheduled" value={data.interviewsScheduled} href="/applications" />
        <KpiCard label="Offers Extended" value={data.offersExtended} href="/applications" />
        <KpiCard label="Hires This Month" value={data.hiresThisMonth} href="/applications" />
      </div>

      {/* Pipeline Overview */}
      <SectionCard title="Pipeline Overview" viewAllHref="/applications">
        {pipelineCounts.every((p) => p.count === 0) ? (
          <EmptyState title="No applications yet" description="Applications will appear here as candidates apply." />
        ) : (
          <div className="space-y-1">
            {pipelineCounts.map((p) => (
              <PipelineBar
                key={p.status}
                label={p.status}
                count={p.count}
                max={maxPipelineCount}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Recent Applications & Upcoming Interviews */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Recent Applications" viewAllHref="/applications">
          {data.recentApplications.length === 0 ? (
            <EmptyState title="No applications" description="New applications will show up here." />
          ) : (
            <div className="divide-y divide-border">
              {data.recentApplications.map((app) => (
                <Link
                  key={app.id}
                  href={`/applications/${app.id}`}
                  className="-mx-2 flex items-center justify-between rounded px-2 py-3 hover:bg-muted"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {employeeName(app.candidate)}
                    </p>
                    <p className="text-xs text-muted-foreground">{app.jobRequisition?.title ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground/70">{formatDate(app.appliedAt)}</span>
                    <StatusBadge status={app.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Upcoming Interviews">
          {data.upcomingInterviews.length === 0 ? (
            <EmptyState title="No upcoming interviews" description="Scheduled interviews will appear here." />
          ) : (
            <div className="divide-y divide-border">
              {data.upcomingInterviews.map((iv) => (
                <Link
                  key={iv.id}
                  href={`/applications/${iv.applicationId}`}
                  className="-mx-2 flex items-center justify-between rounded px-2 py-3 hover:bg-muted"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {employeeName(iv.application.candidate)}
                    </p>
                    <p className="text-xs text-muted-foreground">{iv.type.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground/70">{formatDateTime(iv.scheduledAt)}</span>
                    <StatusBadge status={iv.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Recent Offers */}
      <div className="mt-6">
        <SectionCard title="Recent Offers">
          {data.recentOffers.length === 0 ? (
            <EmptyState title="No offers yet" description="Offers will appear here once created." />
          ) : (
            <div className="divide-y divide-border">
              {data.recentOffers.map((o) => (
                <Link
                  key={o.id}
                  href={`/applications/${o.applicationId}`}
                  className="-mx-2 flex items-center justify-between rounded px-2 py-3 hover:bg-muted"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{o.offerNumber}</p>
                    <p className="text-xs text-muted-foreground">{employeeName(o.application.candidate)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{formatCurrency(o.baseSalary)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
