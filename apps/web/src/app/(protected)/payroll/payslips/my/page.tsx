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
  useTableParams,
  sortLocal,
  paginateLocal,
} from '@/lib/hooks';
import { getMyPayslips } from '@/lib/payroll-api';
import { formatCurrency, formatDate } from '@/lib/format';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MyPayslipsPage() {
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();

  const yearFilter = searchParams.get('year') || '';
  const [year, setYear] = useState(yearFilter);

  const { data, error, loading, refetch } = useAsync(
    () => getMyPayslips(year ? parseInt(year, 10) : undefined),
    [year],
  );

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'period':
            return item.payrollCycle
              ? `${item.payrollCycle.year}-${String(item.payrollCycle.month).padStart(2, '0')}`
              : '';
          case 'gross':
            return parseFloat(item.grossEarnings);
          case 'net':
            return parseFloat(item.netPayable);
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

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear + 1; y >= currentYear - 5; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  return (
    <div>
      <PageHeader title="My Payslips" />

      <FilterBar
        onClear={() => { setYear(''); setParams({ year: null, page: null }); }}
        hasActiveFilters={!!year}
      >
        <select
          value={year}
          onChange={(e) => { setYear(e.target.value); setParams({ year: e.target.value || null, page: null }); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </FilterBar>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && total === 0 && (
        <EmptyState title="No payslips" description="Your payslips will appear here once payroll is processed." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Period" sortKey="period" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Dates</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Working Days</th>
                  <SortableHeader label="Gross" sortKey="gross" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Deductions</th>
                  <SortableHeader label="Net Pay" sortKey="net" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {p.payrollCycle ? `${MONTHS[p.payrollCycle.month - 1]} ${p.payrollCycle.year}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {p.payrollCycle && <StatusBadge status={p.payrollCycle.status} />}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">
                      {p.payrollCycle ? `${formatDate(p.payrollCycle.periodStart)} — ${formatDate(p.payrollCycle.periodEnd)}` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-gray-600">{p.effectiveWorkingDays}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-green-700">{formatCurrency(p.grossEarnings)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-red-600">{formatCurrency(p.totalDeductions)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-bold text-gray-900">{formatCurrency(p.netPayable)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link
                        href={`/payroll/payslips/my/${p.payrollCycleId}`}
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
