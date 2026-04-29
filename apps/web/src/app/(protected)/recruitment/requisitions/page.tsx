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
import { listRequisitions } from '@/lib/recruitment-api';
import { employeeName } from '@/lib/format';
import type { RequisitionStatus } from '@/types/recruitment';

const STATUSES: RequisitionStatus[] = [
  'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED',
  'OPEN', 'ON_HOLD', 'FILLED', 'CANCELLED', 'CLOSED',
];

export default function RequisitionsListPage() {
  const { can } = usePermission();
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();
  const status = (searchParams.get('status') as RequisitionStatus) || '';

  const { data, error, loading, refetch } = useAsync(
    () => listRequisitions(status ? { status } : undefined),
    [status],
  );

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'title': return item.title;
          case 'status': return item.status;
          case 'hiringManager': return item.hiringManager ? employeeName(item.hiringManager) : '';
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
        title="Job Requisitions"
        backHref="/recruitment"
        actions={
          can('recruitment.requisition.create') ? (
            <Link
              href="/recruitment/requisitions/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Requisition
            </Link>
          ) : undefined
        }
      />

      <FilterBar
        onClear={() => setParams({ status: null, page: null })}
        hasActiveFilters={!!status}
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
        <EmptyState title="No requisitions found" description="Create your first requisition to get started." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Req #</th>
                  <SortableHeader label="Title" sortKey="title" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Hiring Manager" sortKey="hiringManager" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Openings</th>
                  <SortableHeader label="Status" sortKey="status" currentSort={sort} currentOrder={order} onSort={setSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link href={`/recruitment/requisitions/${req.id}`} className="font-medium text-blue-600 hover:underline">
                        {req.requisitionNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{req.title}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{employeeName(req.hiringManager)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{req.employmentType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{req.positionsFilled}/{req.numberOfOpenings}</td>
                    <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
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
