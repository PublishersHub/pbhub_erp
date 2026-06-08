'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Loading } from '@/components/ui/loading';
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
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();
  const status = (searchParams.get('status') as LeaveRequestStatus) || '';

  const canViewAll = can('leave.read');
  const canApprove = can('leave.approve');

  const defaultView: ViewMode = canViewAll ? 'all' : canApprove ? 'pending' : 'my';
  const [view, setView] = useState<ViewMode>(
    (searchParams.get('view') as ViewMode) || defaultView,
  );

  const { data, error, loading, refetch } = useAsync(() => {
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

  const hasActiveFilters = !!(status || view !== defaultView);

  return (
    <div>
      <PageHeader
        title="Leave Requests"
        actions={
          can('leave.read_own') ? (
            <Link
              href="/leave/requests/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              New Request
            </Link>
          ) : undefined
        }
      />

      <FilterBar
        onClear={() => {
          setView(defaultView);
          setParams({ status: null, view: null, page: null });
        }}
        hasActiveFilters={hasActiveFilters}
      >
        <select
          value={view}
          onChange={(e) => {
            const v = e.target.value as ViewMode;
            setView(v);
            setParams({ view: v === defaultView ? null : v, page: null });
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="my">My Requests</option>
          {canApprove && <option value="pending">Pending Approvals</option>}
          {canViewAll && <option value="all">All Requests</option>}
        </select>
        {view !== 'pending' && (
          <select
            value={status}
            onChange={(e) => setParams({ status: e.target.value || null, page: null })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
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
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
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
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((req: LeaveRequest) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    {view !== 'my' && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {employeeName(req.employee)}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link
                        href={`/leave/requests/${req.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {req.leavePolicy?.name ?? '—'}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {formatDate(req.startDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {formatDate(req.endDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {req.totalDays}
                      {req.isHalfDay && (
                        <span className="ml-1 text-xs text-gray-400">(half)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status} />
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
