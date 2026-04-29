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
import { listInstances } from '@/lib/onboarding-api';
import { formatDate, employeeName } from '@/lib/format';
import type { OnboardingInstanceStatus } from '@/types/onboarding';

const STATUSES: OnboardingInstanceStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export default function OnboardingInstancesPage() {
  const { can } = usePermission();
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();
  const status = (searchParams.get('status') as OnboardingInstanceStatus) || '';

  const { data, error, loading, refetch } = useAsync(
    () => listInstances(status ? { status } : undefined),
    [status],
  );

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'employee': return item.employee ? employeeName(item.employee) : '';
          case 'joiningDate': return item.joiningDate;
          case 'status': return item.status;
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
        title="Onboarding"
        actions={
          can('onboarding.instance.manage') ? (
            <Link
              href="/onboarding/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Start Onboarding
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
        <EmptyState title="No onboarding instances" description="Onboarding instances will appear here when employees are hired." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Employee" sortKey="employee" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Template</th>
                  <SortableHeader label="Joining Date" sortKey="joiningDate" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Tasks</th>
                  <SortableHeader label="Status" sortKey="status" currentSort={sort} currentOrder={order} onSort={setSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((inst) => (
                  <tr key={inst.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link href={`/onboarding/${inst.id}`} className="font-medium text-blue-600 hover:underline">
                        {employeeName(inst.employee)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{inst.templateName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatDate(inst.joiningDate)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{inst._count?.tasks ?? inst.tasks?.length ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={inst.status} /></td>
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
