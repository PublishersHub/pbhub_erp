'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { TableSearch } from '@/components/ui/table-search';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/toast';
import {
  useAsync,
  usePermission,
  useTableParams,
  sortLocal,
  paginateLocal,
} from '@/lib/hooks';
import {
  getMyClaims,
  getPendingClaims,
  getAllClaims,
  reviewExpenseClaim,
} from '@/lib/expense-api';
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
  const confirm = useConfirm();
  const toast = useToast();
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();

  const [view, setView] = useState<ViewMode>('my');
  const statusFilter = (searchParams.get('status') || '') as ExpenseClaimStatus | '';

  useEffect(() => {
    const titleByView: Record<ViewMode, string> = {
      my: 'My Claims · PbHub',
      pending: 'Expense Claims · PbHub',
      all: 'Expense Claims · PbHub',
    };
    document.title = titleByView[view];
  }, [view]);

  const { data, error, errorStatus, loading, refetch } = useAsync(
    () => {
      if (view === 'pending' && canApprove) return getPendingClaims();
      if (view === 'all' && canReadAll) return getAllClaims(statusFilter || undefined);
      return getMyClaims(statusFilter || undefined);
    },
    [view, statusFilter],
  );

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Reset selection on view/data change
  useEffect(() => {
    setSelected(new Set());
  }, [view, data]);

  // For "my" view, filter locally by status if pending view doesn't use it
  const filtered = useMemo(() => {
    if (!data) return [];
    let arr = data;
    if (view === 'my' && statusFilter) arr = arr.filter((c) => c.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (c) =>
          c.claimNumber.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.status.toLowerCase().includes(q) ||
          (c.employee ? employeeName(c.employee).toLowerCase().includes(q) : false),
      );
    }
    return arr;
  }, [data, view, statusFilter, search]);

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

  const showCheckboxes = view === 'pending' && canApprove;
  const allSelected = items.length > 0 && items.every((c) => selected.has(c.id));
  const someSelected = selected.size > 0;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((c) => c.id)));
    }
  }

  async function handleBulkReview(action: 'APPROVED' | 'REJECTED') {
    const ids = items.filter((c) => selected.has(c.id)).map((c) => c.id);
    if (ids.length === 0) return;

    const isApprove = action === 'APPROVED';
    const ok = await confirm({
      title: isApprove
        ? `Approve ${ids.length} claim${ids.length === 1 ? '' : 's'}?`
        : `Reject ${ids.length} claim${ids.length === 1 ? '' : 's'}?`,
      description: isApprove
        ? 'Approved claims will progress to the next step.'
        : 'Submitters will be notified that their claims were rejected.',
      confirmLabel: isApprove ? 'Approve all' : 'Reject all',
      tone: isApprove ? 'default' : 'danger',
    });
    if (!ok) return;

    setBulkLoading(true);
    let success = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await reviewExpenseClaim(id, { action });
        success += 1;
      } catch {
        failed += 1;
      }
    }
    setBulkLoading(false);
    setSelected(new Set());

    if (failed === 0) {
      toast.success(
        isApprove ? 'Claims approved' : 'Claims rejected',
        `${success} claim${success === 1 ? '' : 's'} processed`,
      );
    } else if (success === 0) {
      toast.error('Bulk action failed', `Could not ${isApprove ? 'approve' : 'reject'} any claims`);
    } else {
      toast.warning(
        'Partial success',
        `${success} succeeded, ${failed} failed`,
      );
    }
    await refetch();
  }

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

      {data && data.length > 0 && (
        <div className="mb-3">
          <TableSearch
            value={search}
            onChange={setSearch}
            placeholder={
              view === 'my'
                ? 'Search by claim #, title, or status…'
                : 'Search by claim #, title, employee, or status…'
            }
            className="max-w-md"
          />
        </div>
      )}

      {loading && <SkeletonTable rows={6} cols={7} />}
      {error && (
        <ErrorMessage
          message={error}
          status={errorStatus}
          onRetry={refetch}
          fallback={errorStatus === 403 && view !== 'my' ? { label: 'View my claims', href: '/expenses/claims' } : undefined}
        />
      )}
      {data && total === 0 && (
        <EmptyState
          title={
            search
              ? 'No matching claims'
              : view === 'pending'
              ? 'No pending approvals'
              : view === 'my'
              ? 'No claims yet'
              : 'No expense claims'
          }
          description={
            search
              ? 'Try a different search term.'
              : view === 'my'
              ? 'Create your first expense claim.'
              : view === 'pending'
              ? 'You have no claims awaiting your decision.'
              : 'No claims found.'
          }
          variant="expense"
          {...(view === 'my' && !search
            ? { cta: { label: 'Submit a claim', href: '/expenses/claims/new' } }
            : {})}
        />
      )}
      {data && total > 0 && (
        <div className="hidden md:block overflow-hidden rounded-lg border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  {showCheckboxes && (
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Select all"
                        className="h-4 w-4 rounded border-input"
                      />
                    </th>
                  )}
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
                  <tr key={c.id} className={`group hover:bg-muted/50 transition-colors ${selected.has(c.id) ? 'bg-primary/5' : ''}`}>
                    {showCheckboxes && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggleOne(c.id)}
                          aria-label={`Select ${c.claimNumber}`}
                          className="h-4 w-4 rounded border-input"
                        />
                      </td>
                    )}
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
                      <div className="flex items-center gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <Link
                          href={`/expenses/claims/${c.id}`}
                          className="inline-flex h-7 items-center gap-1 rounded-lg bg-secondary px-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 motion-press"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                            <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                            <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41Z" clipRule="evenodd" />
                          </svg>
                          View
                        </Link>
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

      {/* Mobile card list */}
      {data && total > 0 && (
        <div className="block md:hidden space-y-3">
          {items.map((c) => (
            <div
              key={c.id}
              className={`rounded-lg border border-border bg-card p-4 shadow-soft ${selected.has(c.id) ? 'ring-2 ring-primary/40' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {showCheckboxes && (
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleOne(c.id)}
                        aria-label={`Select ${c.claimNumber}`}
                        className="h-4 w-4 shrink-0 rounded border-input"
                      />
                    )}
                    <p className="text-sm font-semibold text-foreground">{c.claimNumber}</p>
                  </div>
                  <p className="mt-1 truncate text-sm text-foreground" title={c.title}>{c.title}</p>
                  {view !== 'my' && c.employee && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{employeeName(c.employee)}</p>
                  )}
                </div>
                <StatusBadge status={c.status} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-base font-semibold text-foreground">{formatCurrency(c.totalAmount)}</p>
                <Link
                  href={`/expenses/claims/${c.id}`}
                  className="inline-flex h-8 items-center rounded-lg bg-secondary px-3 text-xs font-medium text-foreground hover:bg-secondary/80 motion-press"
                >
                  View
                </Link>
              </div>
              <p className="mt-2 text-xs text-muted-foreground/70">{formatDate(c.createdAt)}</p>
            </div>
          ))}
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      )}

      {/* Sticky bulk-action bar */}
      {showCheckboxes && someSelected && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 motion-fade-in">
          <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-card px-4 py-2.5 shadow-2xl">
            <span className="text-sm font-medium text-foreground">
              {selected.size} selected
            </span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={bulkLoading}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Clear
            </button>
            <div className="h-5 w-px bg-border" />
            <button
              type="button"
              onClick={() => handleBulkReview('APPROVED')}
              disabled={bulkLoading}
              className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground hover:bg-success/90 motion-press disabled:opacity-60"
            >
              {bulkLoading ? 'Processing…' : 'Approve all'}
            </button>
            <button
              type="button"
              onClick={() => handleBulkReview('REJECTED')}
              disabled={bulkLoading}
              className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 motion-press disabled:opacity-60"
            >
              {bulkLoading ? 'Processing…' : 'Reject all'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
