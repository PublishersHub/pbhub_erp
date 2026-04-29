'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  useAsync,
  usePermission,
  useTableParams,
  sortLocal,
  paginateLocal,
} from '@/lib/hooks';
import { getMyClaims, getPendingClaims, getAllClaims } from '@/lib/expense-api';
import { formatCurrency, formatDate, employeeName } from '@/lib/format';
import type { ExpenseClaimStatus } from '@/types/expense';

type ViewMode = 'my' | 'pending' | 'all';

const STATUSES: ExpenseClaimStatus[] = [
  'DRAFT', 'SUBMITTED', 'MANAGER_APPROVED', 'FINANCE_APPROVED',
  'REJECTED', 'REIMBURSED', 'CANCELLED',
];

export default function ExpenseClaimsPage() {
  const { can } = usePermission();
  const canApprove = can('expense.approve');
  const canReadAll = can('expense.read');
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();

  const [view, setView] = useState<ViewMode>('my');
  const statusFilter = (searchParams.get('status') || '') as ExpenseClaimStatus | '';

  const { data, error, loading, refetch } = useAsync(
    () => {
      if (view === 'pending' && canApprove) return getPendingClaims();
      if (view === 'all' && canReadAll) return getAllClaims(statusFilter || undefined);
      return getMyClaims(statusFilter || undefined);
    },
    [view, statusFilter],
  );

  // For "my" view, filter locally by status if pending view doesn't use it
  const filtered = useMemo(() => {
    if (!data) return [];
    if (view === 'my' && statusFilter) return data.filter((c) => c.status === statusFilter);
    return data;
  }, [data, view, statusFilter]);

  const sorted = useMemo(
    () =>
      sortLocal(filtered, sort, order, (item, key) => {
        switch (key) {
          case 'claimNumber':
            return item.claimNumber;
          case 'title':
            return item.title;
          case 'amount':
            return parseFloat(item.totalAmount);
          case 'status':
            return item.status;
          case 'created':
            return item.createdAt;
          default:
            return null;
        }
      }),
    [filtered, sort, order],
  );

  const { items, total, totalPages } = useMemo(
    () => paginateLocal(sorted, page, pageSize),
    [sorted, page, pageSize],
  );

  return (
    <div>
      <PageHeader
        title="Expense Claims"
        actions={
          <Link
            href="/expenses/claims/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Claim
          </Link>
        }
      />

      {/* View toggle */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setView('my')}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            view === 'my' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          My Claims
        </button>
        {canApprove && (
          <button
            onClick={() => setView('pending')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              view === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending Approvals
          </button>
        )}
        {canReadAll && (
          <button
            onClick={() => setView('all')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              view === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Claims
          </button>
        )}
      </div>

      {view !== 'pending' && (
        <FilterBar
          onClear={() => setParams({ status: null, page: null })}
          hasActiveFilters={!!statusFilter}
        >
          <select
            value={statusFilter}
            onChange={(e) => setParams({ status: e.target.value || null, page: null })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </FilterBar>
      )}

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && total === 0 && (
        <EmptyState
          title={view === 'pending' ? 'No pending approvals' : 'No expense claims'}
          description={view === 'my' ? 'Create your first expense claim.' : 'No claims found.'}
        />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Claim #" sortKey="claimNumber" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Title" sortKey="title" currentSort={sort} currentOrder={order} onSort={setSort} />
                  {view !== 'my' && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Employee</th>
                  )}
                  <SortableHeader label="Amount" sortKey="amount" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Status" sortKey="status" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Policy</th>
                  <SortableHeader label="Created" sortKey="created" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{c.claimNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-[200px] truncate" title={c.title}>{c.title}</td>
                    {view !== 'my' && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{employeeName(c.employee)}</td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(c.totalAmount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{c.expensePolicy?.name ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatDate(c.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link
                        href={`/expenses/claims/${c.id}`}
                        className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                      >
                        View
                      </Link>
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
