'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { FilterBar } from '@/components/ui/filter-bar';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { TableSearch } from '@/components/ui/table-search';
import {
  useAsync,
  usePermission,
  useTableParams,
  sortLocal,
  paginateLocal,
} from '@/lib/hooks';
import {
  getMyReview,
  getTeamReviews,
  getAllReviews,
  listPerformanceCycles,
} from '@/lib/performance-api';
import { employeeName } from '@/lib/format';
import type { PerformanceReview } from '@/types/performance';

type ViewMode = 'my' | 'team' | 'all';

export default function ReviewsPage() {
  useDocumentTitle('Reviews');

  const { can } = usePermission();
  const canReadAll = can('performance.read');
  const canReview = can('performance.review');
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } = useTableParams();

  const [view, setView] = useState<ViewMode>('my');
  const [search, setSearch] = useState('');
  const cycleFilter = searchParams.get('cycleId') || '';

  const { data: cycles } = useAsync(() => listPerformanceCycles(), []);

  // For "my" view, we need a cycleId
  const { data, error, loading, refetch } = useAsync(
    () => {
      if (view === 'my') {
        if (!cycleFilter) return Promise.resolve([] as PerformanceReview[]);
        return getMyReview(cycleFilter).then((r) => [r]).catch(() => [] as PerformanceReview[]);
      }
      if (view === 'team') return getTeamReviews(cycleFilter || undefined);
      return getAllReviews(cycleFilter || undefined);
    },
    [view, cycleFilter],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      const empName = r.employee ? `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase() : '';
      const cycleName = r.cycle?.name?.toLowerCase() ?? '';
      return empName.includes(q) || cycleName.includes(q) || r.status.toLowerCase().includes(q);
    });
  }, [data, search]);

  const sorted = useMemo(
    () =>
      sortLocal(filtered, sort, order, (item, key) => {
        switch (key) {
          case 'employee': return item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : '';
          case 'status': return item.status;
          case 'selfRating': return item.selfRating ? parseFloat(item.selfRating) : 0;
          case 'managerRating': return item.managerRating ? parseFloat(item.managerRating) : 0;
          case 'finalRating': return item.finalRating ? parseFloat(item.finalRating) : 0;
          default: return null;
        }
      }),
    [filtered, sort, order],
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

  function ratingDisplay(val: string | null) {
    if (!val) return '—';
    return parseFloat(val).toFixed(2);
  }

  return (
    <div>
      <PageHeader title="Performance Reviews" />

      <FilterBar
        hasActiveFilters={!!cycleFilter}
        onClear={() => setParams({ cycleId: null, page: null })}
      >
        <div className="flex gap-2">
          <button onClick={() => setView('my')} className={viewBtnCls('my')}>My Review</button>
          {canReview && (
            <button onClick={() => setView('team')} className={viewBtnCls('team')}>Team Reviews</button>
          )}
          {canReadAll && (
            <button onClick={() => setView('all')} className={viewBtnCls('all')}>All Reviews</button>
          )}
        </div>
        <select
          value={cycleFilter}
          onChange={(e) => setParams({ cycleId: e.target.value || null, page: null })}
          className={selectCls}
        >
          <option value="">{view === 'my' ? 'Select a cycle' : 'All Cycles'}</option>
          {(cycles ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </FilterBar>

      {view === 'my' && !cycleFilter && (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-sm text-gray-500">Select a performance cycle to view your review.</p>
        </div>
      )}

      {data && data.length > 0 && (view !== 'my' || cycleFilter) && (
        <div className="mb-3">
          <TableSearch value={search} onChange={setSearch} placeholder="Search reviews…" />
        </div>
      )}

      {(view !== 'my' || cycleFilter) && loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && total === 0 && (view !== 'my' || cycleFilter) && (
        <EmptyState
          title={search ? 'No reviews match your search' : 'No reviews'}
          description={
            search
              ? 'Try a different search term.'
              : 'Reviews are created when a cycle transitions to the self-review phase. Check back once your cycle moves forward.'
          }
          variant={search ? 'search' : 'default'}
          {...(!search ? { cta: { label: 'View cycles', href: '/performance/cycles' } } : {})}
        />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {view !== 'my' && (
                    <SortableHeader label="Employee" sortKey="employee" currentSort={sort} currentOrder={order} onSort={setSort} />
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Cycle</th>
                  <SortableHeader label="Status" sortKey="status" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Self Rating" sortKey="selfRating" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Manager Rating" sortKey="managerRating" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Final Rating" sortKey="finalRating" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Reviewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    {view !== 'my' && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{employeeName(r.employee)}</td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{r.cycle?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/performance/reviews/${r.id}`}>
                        <StatusBadge status={r.status} />
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{ratingDisplay(r.selfRating)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{ratingDisplay(r.managerRating)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-900">{ratingDisplay(r.finalRating)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{employeeName(r.reviewerEmployee)}</td>
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
