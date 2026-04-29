'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { FilterBar } from '@/components/ui/filter-bar';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import {
  useAsync,
  usePermission,
  useTableParams,
  sortLocal,
  paginateLocal,
} from '@/lib/hooks';
import { getMyGoals, getTeamGoals, getAllGoals } from '@/lib/performance-api';
import { listPerformanceCycles } from '@/lib/performance-api';
import { employeeName } from '@/lib/format';

type ViewMode = 'my' | 'team' | 'all';

export default function GoalsPage() {
  const { can } = usePermission();
  const canReadAll = can('performance.read');
  const canApprove = can('performance.approve_goals');
  const canCreate = can('performance.create_goals');
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } = useTableParams();

  const [view, setView] = useState<ViewMode>('my');
  const cycleFilter = searchParams.get('cycleId') || '';

  const { data: cycles } = useAsync(() => listPerformanceCycles(), []);

  const fetcher = view === 'all' ? getAllGoals : view === 'team' ? getTeamGoals : getMyGoals;
  const { data, error, loading, refetch } = useAsync(
    () => fetcher(cycleFilter || undefined),
    [view, cycleFilter],
  );

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'title': return item.title;
          case 'employee': return item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : '';
          case 'status': return item.status;
          case 'weight': return parseFloat(item.weight);
          case 'progress': return parseFloat(item.currentValue);
          default: return null;
        }
      }),
    [data, sort, order],
  );

  const { items, total, totalPages } = useMemo(
    () => paginateLocal(sorted, page, pageSize),
    [sorted, page, pageSize],
  );

  const selectCls =
    'rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  const viewBtnCls = (v: ViewMode) =>
    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      view === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;

  return (
    <div>
      <PageHeader
        title="Goals"
        actions={
          canCreate ? (
            <Link
              href="/performance/goals/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Goal
            </Link>
          ) : undefined
        }
      />

      <FilterBar
        hasActiveFilters={!!cycleFilter}
        onClear={() => setParams({ cycleId: null, page: null })}
      >
        <div className="flex gap-2">
          <button onClick={() => setView('my')} className={viewBtnCls('my')}>My Goals</button>
          {canApprove && (
            <button onClick={() => setView('team')} className={viewBtnCls('team')}>Team Goals</button>
          )}
          {canReadAll && (
            <button onClick={() => setView('all')} className={viewBtnCls('all')}>All Goals</button>
          )}
        </div>
        <select
          value={cycleFilter}
          onChange={(e) => setParams({ cycleId: e.target.value || null, page: null })}
          className={selectCls}
        >
          <option value="">All Cycles</option>
          {(cycles ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </FilterBar>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && total === 0 && (
        <EmptyState title="No goals" description="Create goals for your performance cycle." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Title" sortKey="title" currentSort={sort} currentOrder={order} onSort={setSort} />
                  {view !== 'my' && (
                    <SortableHeader label="Employee" sortKey="employee" currentSort={sort} currentOrder={order} onSort={setSort} />
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Cycle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                  <SortableHeader label="Weight" sortKey="weight" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Progress" sortKey="progress" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Status" sortKey="status" currentSort={sort} currentOrder={order} onSort={setSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/performance/goals/${g.id}`} className="font-medium text-blue-600 hover:underline">
                        {g.title}
                      </Link>
                    </td>
                    {view !== 'my' && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{employeeName(g.employee)}</td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{g.cycle?.name ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={g.measurementType} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{g.weight}%</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {g.measurementType === 'QUALITATIVE' ? g.currentValue || '—' : `${g.currentValue}${g.targetValue ? ` / ${g.targetValue}` : ''}`}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={g.status} /></td>
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
