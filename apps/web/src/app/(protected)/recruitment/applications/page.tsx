'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { useAsync, usePermission, useTableParams, sortLocal, paginateLocal } from '@/lib/hooks';
import { listApplications } from '@/lib/recruitment-api';
import { formatDate } from '@/lib/format';
import type { ApplicationStatus } from '@/types/recruitment';

const STATUSES: ApplicationStatus[] = [
  'APPLIED', 'IN_PROGRESS', 'OFFER_EXTENDED', 'HIRED', 'REJECTED', 'WITHDRAWN', 'ON_HOLD',
];

export default function ApplicationsListPage() {
  const { can } = usePermission();
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();

  const status = (searchParams.get('status') as ApplicationStatus) || '';
  const requisitionId = searchParams.get('requisitionId') || '';
  const candidateId = searchParams.get('candidateId') || '';
  const hasFilters = !!(status || requisitionId || candidateId);

  const { data, error, loading, refetch } = useAsync(
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
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </FilterBar>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && total === 0 && (
        <EmptyState title="No applications found" description="Create an application to get started." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Candidate" sortKey="candidate" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Requisition</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Stage</th>
                  <SortableHeader label="Source" sortKey="source" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Applied" sortKey="appliedAt" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Status" sortKey="status" currentSort={sort} currentOrder={order} onSort={setSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link href={`/recruitment/applications/${app.id}`} className="font-medium text-blue-600 hover:underline">
                        {app.candidate
                          ? `${app.candidate.firstName} ${app.candidate.lastName}`
                          : app.candidateId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {app.jobRequisition?.title || app.jobRequisitionId}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {app.currentStage?.name || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{app.source.replace(/_/g, ' ')}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatDate(app.appliedAt)}</td>
                    <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
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
