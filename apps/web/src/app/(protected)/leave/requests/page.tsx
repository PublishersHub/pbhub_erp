'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { SkeletonTable } from '@/components/ui/skeleton';
import { useToast } from '@/components/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { TableSearch } from '@/components/ui/table-search';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  useAsync,
  usePermission,
  useTableParams,
  sortLocal,
  paginateLocal,
} from '@/lib/hooks';
import {
  getMyLeaveRequests,
  getAllLeaveRequests,
  getPendingApprovals,
  reviewLeaveRequest,
  listHolidays,
} from '@/lib/leave-api';
import { formatDate, employeeName } from '@/lib/format';
import type { LeaveRequestStatus, LeaveRequest, Holiday } from '@/types/leave';

const STATUSES: LeaveRequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

type ViewMode = 'my' | 'pending' | 'all';
type LayoutMode = 'list' | 'calendar';

const VIEW_STORAGE_KEY = 'leave-list-view';

// ─── Calendar helpers ───────────────────────────

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function isoDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function parseIso(iso: string): Date {
  // expects YYYY-MM-DD; treat as local date
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function LeaveRequestsPage() {
  const { can } = usePermission();
  const toast = useToast();
  const confirm = useConfirm();
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();
  const status = (searchParams.get('status') as LeaveRequestStatus) || '';
  const dateFilter = searchParams.get('date') || '';

  const canViewAll = can('leave.read');
  const canApprove = can('leave.approve');

  const [view, setView] = useState<ViewMode>(
    (searchParams.get('view') as ViewMode) || 'my',
  );
  const [search, setSearch] = useState('');
  const [layout, setLayout] = useState<LayoutMode>('list');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // Page title
  useEffect(() => {
    document.title = 'Leave Requests · PbHub';
  }, []);

  // Restore layout pref
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === 'list' || saved === 'calendar') setLayout(saved);
  }, []);

  function changeLayout(next: LayoutMode) {
    setLayout(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    }
  }

  const { data, error, errorStatus, loading, refetch } = useAsync(() => {
    if (view === 'all' && canViewAll) return getAllLeaveRequests(status || undefined);
    if (view === 'pending' && canApprove) return getPendingApprovals();
    return getMyLeaveRequests(status || undefined);
  }, [view, status]);

  // Holidays — only fetched for managers viewing the team-wide list (calendar overlay)
  const showCalendarToggle = view === 'all' || view === 'pending';
  const { data: holidays } = useAsync<Holiday[] | null>(
    () =>
      showCalendarToggle
        ? listHolidays(calendarMonth.getFullYear())
        : Promise.resolve(null),
    [showCalendarToggle, calendarMonth.getFullYear()],
  );

  // Reset selection whenever filters / view change
  useEffect(() => {
    setSelected(new Set());
  }, [view, status, dateFilter, search]);

  const filtered = useMemo(() => {
    let arr = data ?? [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((r) => {
        const name = r.employee
          ? `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase()
          : '';
        const policy = (r.leavePolicy?.name ?? '').toLowerCase();
        const stat = r.status.toLowerCase();
        return name.includes(q) || policy.includes(q) || stat.includes(q);
      });
    }
    if (dateFilter) {
      const target = parseIso(dateFilter);
      arr = arr.filter((r) => {
        const start = parseIso(r.startDate);
        const end = parseIso(r.endDate);
        return target >= start && target <= end;
      });
    }
    return arr;
  }, [data, search, dateFilter]);

  const sorted = useMemo(
    () =>
      sortLocal(filtered, sort, order, (item, key) => {
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
    [filtered, sort, order],
  );

  const { items, total, totalPages } = useMemo(
    () => paginateLocal(sorted, page, pageSize),
    [sorted, page, pageSize],
  );

  const hasActiveFilters = !!(status || view !== 'my' || search || dateFilter);

  // Bulk action helpers — only operate on currently visible PENDING requests
  const pendingVisibleIds = useMemo(
    () => items.filter((r) => r.status === 'PENDING').map((r) => r.id),
    [items],
  );

  const allSelected =
    pendingVisibleIds.length > 0 && pendingVisibleIds.every((id) => selected.has(id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingVisibleIds));
    }
  }

  async function runBulk(action: 'APPROVED' | 'REJECTED') {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    const ok = await confirm({
      title: action === 'APPROVED' ? `Approve ${ids.length} request${ids.length === 1 ? '' : 's'}?` : `Reject ${ids.length} request${ids.length === 1 ? '' : 's'}?`,
      description:
        action === 'APPROVED'
          ? 'Each selected request will be marked approved.'
          : 'Each selected request will be marked rejected.',
      confirmLabel: action === 'APPROVED' ? 'Approve all' : 'Reject all',
      cancelLabel: 'Keep reviewing',
      tone: action === 'APPROVED' ? 'default' : 'danger',
    });
    if (!ok) return;

    setBulkBusy(true);
    let succeeded = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await reviewLeaveRequest(id, { action });
        succeeded += 1;
      } catch {
        failed += 1;
      }
    }
    setBulkBusy(false);
    setSelected(new Set());

    const verb = action === 'APPROVED' ? 'Approved' : 'Rejected';
    if (failed === 0) {
      toast.success(`${verb} ${succeeded} request${succeeded === 1 ? '' : 's'}`);
    } else {
      toast.warning(
        `${verb} ${succeeded} of ${succeeded + failed}`,
        `${failed} failed`,
      );
    }
    refetch();
  }

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

      {/* List | Calendar toggle (managers / HR only) */}
      {showCalendarToggle && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-sm">
            <button
              type="button"
              onClick={() => changeLayout('list')}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${layout === 'list' ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-muted'}`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => changeLayout('calendar')}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${layout === 'calendar' ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-muted'}`}
            >
              Calendar
            </button>
          </div>
          {dateFilter && (
            <button
              type="button"
              onClick={() => setParams({ date: null, page: null })}
              className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted"
            >
              Clear date filter ({formatDate(dateFilter)})
            </button>
          )}
        </div>
      )}

      <FilterBar
        onClear={() => {
          setView('my');
          setSearch('');
          setParams({ status: null, view: null, page: null, date: null });
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
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search employee, type, status…"
          className="min-w-[14rem] flex-1"
        />
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
          variant="leave"
          title="No leave requests found"
          description={
            view === 'pending'
              ? 'No requests pending your approval right now.'
              : view === 'all'
              ? 'No team requests match the current filters.'
              : 'Submit your first leave request to see it here.'
          }
          cta={
            view === 'my' && can('leave.read_own')
              ? { label: 'Apply for leave', href: '/leave/requests/new' }
              : undefined
          }
        />
      )}

      {/* CALENDAR VIEW (manager / HR) */}
      {data && showCalendarToggle && layout === 'calendar' && (
        <CalendarView
          month={calendarMonth}
          onPrev={() => setCalendarMonth((m) => addMonths(m, -1))}
          onNext={() => setCalendarMonth((m) => addMonths(m, 1))}
          onToday={() => setCalendarMonth(startOfMonth(new Date()))}
          requests={filtered}
          holidays={holidays ?? []}
          selectedDate={dateFilter}
          onPickDate={(iso) => setParams({ date: iso, page: null })}
        />
      )}

      {/* LIST VIEW */}
      {data && total > 0 && (layout === 'list' || !showCalendarToggle) && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-soft md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/60">
                  <tr>
                    {canApprove && view !== 'my' && (
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all pending"
                          className="rounded border-input"
                        />
                      </th>
                    )}
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
                  {items.map((req: LeaveRequest) => {
                    const isPending = req.status === 'PENDING';
                    return (
                      <tr key={req.id} className="group transition-colors hover:bg-muted/50">
                        {canApprove && view !== 'my' && (
                          <td className="px-4 py-3">
                            {isPending && (
                              <input
                                type="checkbox"
                                checked={selected.has(req.id)}
                                onChange={() => toggleSelect(req.id)}
                                aria-label={`Select request from ${employeeName(req.employee)}`}
                                className="rounded border-input"
                              />
                            )}
                          </td>
                        )}
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
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

          {/* Mobile cards */}
          <div className="block space-y-3 md:hidden">
            {items.map((req) => {
              const isPending = req.status === 'PENDING';
              return (
                <div
                  key={req.id}
                  className="rounded-lg border border-border bg-card p-4 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {view !== 'my' && (
                        <p className="truncate text-sm font-medium text-foreground">
                          {employeeName(req.employee)}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(req.startDate)} – {formatDate(req.endDate)}
                      </p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {req.leavePolicy?.name && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {req.leavePolicy.name}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {req.totalDays} day{req.totalDays === '1' ? '' : 's'}
                      {req.isHalfDay && ' · half'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {canApprove && view !== 'my' && isPending ? (
                      <label className="inline-flex items-center gap-2 text-xs text-foreground/80">
                        <input
                          type="checkbox"
                          checked={selected.has(req.id)}
                          onChange={() => toggleSelect(req.id)}
                          className="rounded border-input"
                        />
                        Select
                      </label>
                    ) : (
                      <span />
                    )}
                    <Link
                      href={`/leave/requests/${req.id}`}
                      className="inline-flex h-7 items-center gap-1 rounded-lg bg-secondary px-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 motion-press"
                    >
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      {/* Sticky bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 shadow-soft backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">
              {selected.size} selected
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted"
              >
                Clear
              </button>
              <LoadingButton
                type="button"
                variant="destructive"
                loading={bulkBusy}
                loadingText="Working…"
                onClick={() => runBulk('REJECTED')}
              >
                Reject all
              </LoadingButton>
              <LoadingButton
                type="button"
                loading={bulkBusy}
                loadingText="Working…"
                onClick={() => runBulk('APPROVED')}
              >
                Approve all
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Calendar component ─────────────────────────

interface CalendarViewProps {
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  requests: LeaveRequest[];
  holidays: Holiday[];
  selectedDate: string;
  onPickDate: (iso: string) => void;
}

function CalendarView({
  month,
  onPrev,
  onNext,
  onToday,
  requests,
  holidays,
  selectedDate,
  onPickDate,
}: CalendarViewProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay()); // back to Sunday
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay())); // forward to Saturday

  const cells: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    cells.push(new Date(d));
  }

  const today = new Date();
  const holidayMap = useMemo(() => {
    const m = new Map<string, Holiday>();
    for (const h of holidays) m.set(h.date.slice(0, 10), h);
    return m;
  }, [holidays]);

  // Filter to only PENDING + APPROVED requests for the calendar
  const visibleRequests = useMemo(
    () => requests.filter((r) => r.status === 'PENDING' || r.status === 'APPROVED'),
    [requests],
  );

  function leavesOn(day: Date) {
    return visibleRequests.filter((r) => {
      const start = parseIso(r.startDate);
      const end = parseIso(r.endDate);
      return day >= start && day <= end;
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrev}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted motion-press"
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted motion-press"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted motion-press"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {DAY_NAMES.map((d) => (
          <div key={d} className="px-1 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const inMonth = day.getMonth() === month.getMonth();
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const iso = isoDate(day);
          const holiday = holidayMap.get(iso);
          const isToday = sameDay(day, today);
          const isSelected = selectedDate && iso === selectedDate;
          const dayLeaves = leavesOn(day);
          const visible = dayLeaves.slice(0, 3);
          const overflow = dayLeaves.length - visible.length;
          return (
            <button
              type="button"
              key={i}
              onClick={() => onPickDate(iso)}
              className={`group relative flex min-h-[96px] flex-col items-stretch gap-1 border-b border-r border-border p-1.5 text-left transition-colors hover:bg-muted/40
                ${!inMonth ? 'bg-muted/20 text-muted-foreground/60' : ''}
                ${isWeekend && inMonth ? 'bg-muted/20' : ''}
                ${isSelected ? 'ring-2 ring-inset ring-primary' : ''}
              `}
              title={holiday ? `Holiday: ${holiday.name}` : undefined}
            >
              {holiday && (
                <span
                  aria-hidden
                  className={`absolute inset-x-0 top-0 h-1 ${holiday.isOptional ? 'bg-warning/70' : 'bg-primary/70'}`}
                />
              )}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[11px] font-medium
                    ${isToday ? 'bg-primary text-primary-foreground' : isWeekend ? 'text-muted-foreground' : 'text-foreground/80'}
                  `}
                >
                  {day.getDate()}
                </span>
                {holiday && (
                  <span className="truncate text-[10px] font-medium text-primary/80">
                    {holiday.name}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                {visible.map((r) => (
                  <div
                    key={r.id}
                    className={`truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${
                      r.status === 'APPROVED'
                        ? 'bg-success/15 text-success'
                        : 'bg-primary/15 text-primary'
                    }`}
                  >
                    {employeeName(r.employee)} · {r.leavePolicy?.code ?? r.leavePolicy?.name ?? 'Leave'}
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="truncate rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    +{overflow} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
