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
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </Link>
  );
}

function PipelineBar({ label, count, max, colorClass }: { label: string; count: number; max: number; colorClass: string }) {
  const width = max > 0 ? Math.max(2, (count / max) * 100) : 2;
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="w-32 shrink-0 text-right text-sm text-gray-600">{label.replace(/_/g, ' ')}</span>
      <div className="flex-1">
        <div className={`h-6 rounded ${colorClass}`} style={{ width: `${width}%` }} />
      </div>
      <span className="w-8 text-sm font-medium text-gray-700">{count}</span>
    </div>
  );
}

function SectionCard({ title, children, viewAllHref }: { title: string; children: React.ReactNode; viewAllHref?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-sm text-blue-600 hover:text-blue-800">
            View all
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Pipeline config ─────────────────────────

const PIPELINE_STATUSES: { status: ApplicationStatus; colorClass: string }[] = [
  { status: 'APPLIED', colorClass: 'bg-blue-500' },
  { status: 'IN_PROGRESS', colorClass: 'bg-cyan-500' },
  { status: 'OFFER_EXTENDED', colorClass: 'bg-indigo-500' },
  { status: 'ON_HOLD', colorClass: 'bg-orange-400' },
  { status: 'HIRED', colorClass: 'bg-green-500' },
  { status: 'REJECTED', colorClass: 'bg-red-500' },
  { status: 'WITHDRAWN', colorClass: 'bg-gray-400' },
];

// ─── Main component ─────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, error, loading, refetch } = useAsync(() => getDashboardSummary());

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!data) return null;

  const pipelineCounts = PIPELINE_STATUSES.map(({ status, colorClass }) => ({
    status,
    colorClass,
    count: data.pipeline[status] ?? 0,
  }));
  const maxPipelineCount = Math.max(...pipelineCounts.map((p) => p.count), 1);

  return (
    <div>
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
                colorClass={p.colorClass}
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
            <div className="divide-y divide-gray-100">
              {data.recentApplications.map((app) => (
                <Link
                  key={app.id}
                  href={`/applications/${app.id}`}
                  className="-mx-2 flex items-center justify-between rounded px-2 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {employeeName(app.candidate)}
                    </p>
                    <p className="text-xs text-gray-500">{app.jobRequisition?.title ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{formatDate(app.appliedAt)}</span>
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
            <div className="divide-y divide-gray-100">
              {data.upcomingInterviews.map((iv) => (
                <Link
                  key={iv.id}
                  href={`/applications/${iv.applicationId}`}
                  className="-mx-2 flex items-center justify-between rounded px-2 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {employeeName(iv.application.candidate)}
                    </p>
                    <p className="text-xs text-gray-500">{iv.type.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{formatDateTime(iv.scheduledAt)}</span>
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
            <div className="divide-y divide-gray-100">
              {data.recentOffers.map((o) => (
                <Link
                  key={o.id}
                  href={`/applications/${o.applicationId}`}
                  className="-mx-2 flex items-center justify-between rounded px-2 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{o.offerNumber}</p>
                    <p className="text-xs text-gray-500">{employeeName(o.application.candidate)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{formatCurrency(o.baseSalary)}</span>
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
