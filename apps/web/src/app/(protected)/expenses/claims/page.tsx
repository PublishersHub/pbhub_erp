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
            className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium"
          >
            New Claim
          </Link>
        }
      />

      {/* View toggle */}
      <div className="mb-4 flex gap-2">
        <Link
          href="/expenses/claims/new"
          className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium"
        >
          New Claim
        </Link>
      )}
      />

      {/* View toggle */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setView('my')}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            view === 'my' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          My Claims
        </button>
        {canApprove && (
          <button
            onClick={() => setView('pending')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              view === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Pending Approvals
          </button>
        )}
        {canReadAll && (
          <button
            onClick={() => setView('all')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              view === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
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
            className="rounded-md border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none bg-card text-foreground"
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
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <SortableHeader label="Claim #" sortKey="claimNumber" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Title" sortKey="title" currentSort={sort} currentOrder={order} onSort={setSort} />
                  {view !== 'my' && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Employee</th>
                  )}
                  <SortableHeader label="Amount" sortKey="amount" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Status" sortKey="status" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Policy</th>
                  <SortableHeader label="Created" sortKey="created" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">{c.claimNumber}</td>
                    <td className="px-4 py-3 text-sm text-foreground max-w-[200px] truncate" title={c.title}>{c.title}</td>
                    {view !== 'my' && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{employeeName(c.employee)}</td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">{formatCurrency(c.totalAmount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground/70">{c.expensePolicy?.name ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{formatDate(c.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link
                        href={`/expenses/claims/${c.id}`}
                        className="rounded bg-primary-soft text-primary px-2 py-1 text-xs hover:bg-primary/20 font-medium"
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
