'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { DateRangePicker, type DateRange } from '@/components/ui/date-range-picker';
import {
  useAsync,
  usePermission,
  useTableParams,
  sortLocal,
  paginateLocal,
} from '@/lib/hooks';
import { getMySummaries, getAllSummaries } from '@/lib/attendance-api';
import { formatDate } from '@/lib/format';
import { employeeName } from '@/lib/format';

type ViewMode = 'my' | 'all';

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function DailySummaryPage() {
  useEffect(() => {
    document.title = 'Daily Attendance · PbHub';
  }, []);

  const { can } = usePermission();
  const canReadAll = can('attendance.read');
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();

  const [view, setView] = useState<ViewMode>('my');

  // Default date range: This month
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const fromFilter = searchParams.get('from') || isoDate(monthStart);
  const toFilter = searchParams.get('to') || isoDate(today);
  const statusFilter = searchParams.get('status') || '';

  const range: DateRange = { from: fromFilter, to: toFilter };
  const handleRangeChange = (r: DateRange) => {
    setParams({ from: r.from || null, to: r.to || null, page: null });
  };

  const { data, error, errorStatus, loading, refetch } = useAsync(
    () =>
      view === 'all' && canReadAll
        ? getAllSummaries({ from: fromFilter, to: toFilter })
        : getMySummaries(fromFilter, toFilter),
    [view, fromFilter, toFilter],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!statusFilter) return data;
    return data.filter((s) => s.status === statusFilter);
  }, [data, statusFilter]);

  const sorted = useMemo(
    () =>
      sortLocal(filtered, sort, order, (item, key) => {
        switch (key) {
          case 'date':
            return item.date;
          case 'employee':
            return item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : '';
          case 'status':
            return item.status;
          case 'worked':
            return item.totalWorkedMinutes;
          case 'late':
            return item.lateMinutes;
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

  function formatMinutes(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  const statuses = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND'];

  return (
    <div>
      <PageHeader title="Daily Attendance Summary" />

      {canReadAll && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setView('my')}
            className={`rounded-md px-4 py-2 text-sm font-medium motion-press transition-colors ${
              view === 'my' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            My Attendance
          </button>
          <button
            onClick={() => setView('all')}
            className={`rounded-md px-4 py-2 text-sm font-medium motion-press transition-colors ${
              view === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            All Employees
          </button>
        </div>
      )}

      <FilterBar
        onClear={() => setParams({ from: null, to: null, status: null, page: null })}
        hasActiveFilters={!!statusFilter || !!searchParams.get('from') || !!searchParams.get('to')}
      >
        <DateRangePicker value={range} onChange={handleRangeChange} />
        <select
          value={statusFilter}
          onChange={(e) => setParams({ status: e.target.value || null, page: null })}
          className="rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors"
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </FilterBar>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} status={errorStatus} onRetry={refetch} />}
      {data && total === 0 && (
        <EmptyState
          title="No records found"
          description="Adjust filters or check back later."
          variant="attendance"
        />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <SortableHeader label="Date" sortKey="date" currentSort={sort} currentOrder={order} onSort={setSort} />
                  {view === 'all' && (
                    <SortableHeader label="Employee" sortKey="employee" currentSort={sort} currentOrder={order} onSort={setSort} />
                  )}
                  <SortableHeader label="Status" sortKey="status" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">First In</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Last Out</th>
                  <SortableHeader label="Worked" sortKey="worked" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Late" sortKey="late" currentSort={sort} currentOrder={order} onSort={setSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                      {formatDate(s.date)}
                    </td>
                    {view === 'all' && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground/80">
                        {employeeName(s.employee)}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {s.firstCheckIn
                        ? new Date(s.firstCheckIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {s.lastCheckOut
                        ? new Date(s.lastCheckOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                      {formatMinutes(s.totalWorkedMinutes)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {s.lateMinutes > 0 ? (
                        <span className="text-destructive">{formatMinutes(s.lateMinutes)}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <ul className="block md:hidden divide-y divide-border">
            {items.map((s) => (
              <li key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{formatDate(s.date)}</p>
                  <StatusBadge status={s.status} />
                </div>
                {view === 'all' && (
                  <p className="mt-1 text-xs text-muted-foreground">{employeeName(s.employee)}</p>
                )}
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">In</p>
                    <p className="font-medium text-foreground">
                      {s.firstCheckIn
                        ? new Date(s.firstCheckIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Out</p>
                    <p className="font-medium text-foreground">
                      {s.lastCheckOut
                        ? new Date(s.lastCheckOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Worked</p>
                    <p className="font-medium text-foreground">{formatMinutes(s.totalWorkedMinutes)}</p>
                  </div>
                </div>
                {s.lateMinutes > 0 && (
                  <p className="mt-2 text-xs text-destructive">Late: {formatMinutes(s.lateMinutes)}</p>
                )}
              </li>
            ))}
          </ul>
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
