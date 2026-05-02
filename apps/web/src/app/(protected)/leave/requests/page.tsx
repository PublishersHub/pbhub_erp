'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Loading } from '@/components/ui/loading';
import { SkeletonTable } from '@/components/ui/skeleton';
import { useToast } from '@/components/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { FilterBar } from '@/components/ui/filter-bar';
import {
  useAsync,
  usePermission,
  useTableParams,
  sortLocal,
  paginateLocal,
} from '@/lib/hooks';
import { getMyLeaveRequests, getAllLeaveRequests, getPendingApprovals } from '@/lib/leave-api';
import { formatDate, employeeName } from '@/lib/format';
import type { LeaveRequestStatus, LeaveRequest } from '@/types/leave';

const STATUSES: LeaveRequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

type ViewMode = 'my' | 'pending' | 'all';

export default function LeaveRequestsPage() {
  const { can } = usePermission();
  const { info } = useToast();
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();
  const status = (searchParams.get('status') as LeaveRequestStatus) || '';

  const canViewAll = can('leave.read');
  const canApprove = can('leave.approve');

  const [view, setView] = useState<ViewMode>(
    (searchParams.get('view') as ViewMode) || 'my',
  );

  const { data, error, errorStatus, loading, refetch } = useAsync(() => {
    if (view === 'all' && canViewAll) return getAllLeaveRequests(status || undefined);
    if (view === 'pending' && canApprove) return getPendingApprovals();
    return getMyLeaveRequests(status || undefined);
  }, [view, status]);

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'employee':
            return item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : '';
          case 'policy':
            return item.leavePolicy?.name ?? '';
          case 'startDate':
            return item.startDate;
          case 'status':
            return item.status;
          case 'totalDays':
            return parseFloat(item.totalDays);
          default:
            return null;
        }
      }),
    [data, sort, order],
  );

  const { items, total, totalPages } = useMemo(
    () => paginateLocal(sorted, page, pageSize),
    [sorted, page, pageSize],
  );

  const hasActiveFilters = !!(status || view !== 'my');

  return (
    <div>
      <PageHeader
        title="Leave Requests"
        actions={
          can('leave.read_own') ? (
            <Link
              href="/leave/requests/new"
              className="motion-press rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              New Request
            </Link>
          ) : undefined
        }
      />

      <FilterBar
        onClear={() => {
          setView('my');
          setParams({ status: null, view: null, page: null });
        }}
        hasActiveFilters={hasActiveFilters}
      >
        <select
          value={view}
          onChange={(e) => {
            const v = e.target.value as ViewMode;
            setView(v);
            setParams({ view: v === 'my' ? null : v, page: null });
          }}
          className="rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
        >
          <option value="my">My Requests</option>
          {canApprove && <option value="pending">Pending Approvals</option>}
          {canViewAll && <option value="all">All Requests</option>}
        </select>
        {view !== 'pending' && (
          <select
            value={status}
            onChange={(e) => setParams({ status: e.target.value || null, page: null })}
            className="rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </FilterBar>

      {loading && <SkeletonTable rows={6} cols={6} />}
      {error && (
        <ErrorMessage
          message={error}
          status={errorStatus}
          onRetry={refetch}
          fallback={errorStatus === 403 && view !== 'my' ? { label: 'View my requests', href: '/leave/requests?view=my' } : undefined}
        />
      )}
      {data && total === 0 && (
        <EmptyState
          title="No leave requests found"
          description={
            view === 'pending'
              ? 'No requests pending your approval.'
              : 'Submit your first leave request.'
          }
        />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  {view !== 'my' && (
                    <SortableHeader
                      label="Employee"
                      sortKey="employee"
                      currentSort={sort}
                      currentOrder={order}
                      onSort={setSort}
                    />
                  )}
                  <SortableHeader
                    label="Policy"
                    sortKey="policy"
                    currentSort={sort}
                    currentOrder={order}
                    onSort={setSort}
                  />
                  <SortableHeader
                    label="Start"
                    sortKey="startDate"
                    currentSort={sort}
                    currentOrder={order}
                    onSort={setSort}
                  />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    End
                  </th>
                  <SortableHeader
                    label="Days"
                    sortKey="totalDays"
                    currentSort={sort}
                    currentOrder={order}
                    onSort={setSort}
                  />
                  <SortableHeader
                    label="Status"
                    sortKey="status"
                    currentSort={sort}
                    currentOrder={order}
                    onSort={setSort}
                  />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((req: LeaveRequest) => (
                  <tr key={req.id} className="group transition-colors hover:bg-muted/50">
                    {view !== 'my' && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                        {employeeName(req.employee)}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link
                        href={`/leave/requests/${req.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {req.leavePolicy?.name ?? '—'}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(req.startDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(req.endDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                      {req.totalDays}
                      {req.isHalfDay && (
                        <span className="ml-1 text-xs text-muted-foreground/70">(half)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <Link
                          href={`/leave/requests/${req.id}`}
                          className="inline-flex h-7 items-center gap-1 rounded-lg bg-secondary px-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 motion-press"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                            <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                            <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41Z" clipRule="evenodd" />
                          </svg>
                          View
                        </Link>
                        {req.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => info('Open the request to review approvals')}
                            className="inline-flex h-7 items-center gap-1 rounded-lg bg-success/15 px-2 text-xs font-medium text-success transition-colors hover:bg-success/25 motion-press"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                            </svg>
                            Quick approve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
