'use client';

import { useEffect, useMemo } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { useAsync, usePermission, useTableParams, sortLocal, paginateLocal } from '@/lib/hooks';
import { listApplications } from '@/lib/recruitment-api';
import { formatDate } from '@/lib/format';
import { useToast } from '@/components/toast';
import type { ApplicationStatus } from '@/types/recruitment';

const STATUSES: ApplicationStatus[] = [
  'APPLIED', 'IN_PROGRESS', 'OFFER_EXTENDED', 'HIRED', 'REJECTED', 'WITHDRAWN', 'ON_HOLD',
];

export default function ApplicationsListPage() {
  useDocumentTitle('Applications');
  const { can } = usePermission();
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();
  const { toast } = useToast();

  const status = (searchParams.get('status') as ApplicationStatus) || '';
  const requisitionId = searchParams.get('requisitionId') || '';
  const candidateId = searchParams.get('candidateId') || '';
  const hasFilters = !!(status || requisitionId || candidateId);

  const { data, error, errorStatus, loading, refetch } = useAsync(
    () =>
      listApplications({
        ...(status && { status }),
        ...(requisitionId && { requisitionId }),
        ...(candidateId && { candidateId }),
      }),
    [status, requisitionId, candidateId],
  );

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'candidate':
            return item.candidate
              ? `${item.candidate.firstName} ${item.candidate.lastName}`
              : '';
          case 'status': return item.status;
          case 'appliedAt': return item.appliedAt;
          case 'source': return item.source;
          default: return null;
        }
      }),
    [data, sort, order],
  );

  const { items, total, totalPages } = useMemo(
    () => paginateLocal(sorted, page, pageSize),
    [sorted, page, pageSize],
  );

  return (
    <div>
      <PageHeader
        title="Applications"
        backHref="/recruitment"
        actions={
          can('recruitment.application.manage') ? (
            <Link
              href="/recruitment/applications/new"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 motion-press"
            >
              Create Application
            </Link>
          ) : undefined
        }
      />

      <FilterBar
        onClear={() =>
          setParams({ status: null, requisitionId: null, candidateId: null, page: null })
        }
        hasActiveFilters={hasFilters}
      >
        <select
          value={status}
          onChange={(e) => setParams({ status: e.target.value || null, page: null })}
          className="rounded-md border border-input bg-card text-foreground focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </FilterBar>

      {loading && <SkeletonTable rows={6} cols={7} />}
      {error && <ErrorMessage message={error} status={errorStatus} onRetry={refetch} />}
      {data && total === 0 && (
        <EmptyState title="No applications found" description="Create an application to get started." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <SortableHeader label="Candidate" sortKey="candidate" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Requisition</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Stage</th>
                  <SortableHeader label="Source" sortKey="source" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Applied" sortKey="appliedAt" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Status" sortKey="status" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((app) => (
                  <tr key={app.id} className="group hover:bg-muted/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link href={`/recruitment/applications/${app.id}`} className="font-medium text-primary hover:underline">
                        {app.candidate
                          ? `${app.candidate.firstName} ${app.candidate.lastName}`
                          : app.candidateId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {app.jobRequisition?.title || app.jobRequisitionId}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {app.currentStage?.name || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{app.source.replace(/_/g, ' ')}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{formatDate(app.appliedAt)}</td>
                    <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Link
                          href={`/recruitment/applications/${app.id}`}
                          className="inline-flex h-7 items-center gap-1 rounded-lg bg-secondary px-2 text-xs font-medium text-foreground hover:bg-secondary/80 motion-press transition-colors"
                        >
                          View
                        </Link>
                        {app.status === 'IN_PROGRESS' && (
                          <button
                            type="button"
                            onClick={() =>
                              toast({
                                title: 'Move stage',
                                description: 'Open the application to move stage',
                                variant: 'info',
                              })
                            }
                            className="inline-flex h-7 items-center gap-1 rounded-lg bg-info/15 px-2 text-xs font-medium text-info hover:bg-info/25 motion-press transition-colors"
                          >
                            Move stage
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
