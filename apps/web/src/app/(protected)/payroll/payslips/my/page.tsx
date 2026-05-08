'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { TableSearch } from '@/components/ui/table-search';
import {
  useAsync,
  useTableParams,
  sortLocal,
  paginateLocal,
} from '@/lib/hooks';
import { getMyPayslips } from '@/lib/payroll-api';
import { formatCurrency, formatDate } from '@/lib/format';
import { exportToExcel } from '@/lib/excel-export';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MyPayslipsPage() {
  useDocumentTitle('Payslips');

  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();

  const yearFilter = searchParams.get('year') || '';
  const [year, setYear] = useState(yearFilter);
  const [search, setSearch] = useState('');

  const { data, error, errorStatus, loading, refetch } = useAsync(
    () => getMyPayslips(year ? parseInt(year, 10) : undefined),
    [year],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data.filter((p) => {
      const period = p.payrollCycle ? `${MONTHS[p.payrollCycle.month - 1]} ${p.payrollCycle.year}`.toLowerCase() : '';
      return period.includes(q);
    });
  }, [data, search]);

  const sorted = useMemo(
    () =>
      sortLocal(filtered, sort, order, (item, key) => {
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
    [filtered, sort, order],
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
      <PageHeader
        title="My Payslips"
        actions={
          sorted.length > 0 ? (
            <button
              onClick={() => {
                const rows = sorted.map((p) => ({
                  Period: p.payrollCycle ? `${MONTHS[p.payrollCycle.month - 1]} ${p.payrollCycle.year}` : '',
                  'Gross Earnings': p.grossEarnings,
                  'Total Deductions': p.totalDeductions,
                  'Net Payable': p.netPayable,
                  Status: p.payrollCycle?.status ?? '',
                }));
                exportToExcel(`my-payslips-${new Date().toISOString().slice(0, 10)}`, rows);
              }}
              className="rounded-md border border-input bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted motion-press"
            >
              Export to Excel
            </button>
          ) : undefined
        }
      />

      <FilterBar
        onClear={() => { setYear(''); setParams({ year: null, page: null }); }}
        hasActiveFilters={!!year}
      >
        <select
          value={year}
          onChange={(e) => { setYear(e.target.value); setParams({ year: e.target.value || null, page: null }); }}
          className="rounded-md border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none bg-card text-foreground"
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </FilterBar>

      {data && data.length > 0 && (
        <div className="mb-3">
          <TableSearch value={search} onChange={setSearch} placeholder="Search payslips by period…" />
        </div>
      )}

      {loading && <Loading />}
      {error && <ErrorMessage message={error} status={errorStatus} onRetry={refetch} />}
      {data && total === 0 && (
        <EmptyState
          title={search ? 'No payslips match your search' : 'No payslips'}
          description={search ? 'Try a different search term.' : 'Your payslips will appear here once payroll is processed.'}
          variant={search ? 'search' : 'default'}
        />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <SortableHeader label="Period" sortKey="period" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Dates</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Working Days</th>
                  <SortableHeader label="Gross" sortKey="gross" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Deductions</th>
                  <SortableHeader label="Net Pay" sortKey="net" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                      {p.payrollCycle ? `${MONTHS[p.payrollCycle.month - 1]} ${p.payrollCycle.year}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {p.payrollCycle && <StatusBadge status={p.payrollCycle.status} />}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {p.payrollCycle ? `${formatDate(p.payrollCycle.periodStart)} — ${formatDate(p.payrollCycle.periodEnd)}` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-muted-foreground">{p.effectiveWorkingDays}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-success">{formatCurrency(p.grossEarnings)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-destructive">{formatCurrency(p.totalDeductions)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-bold text-foreground">{formatCurrency(p.netPayable)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link
                        href={`/payroll/payslips/my/${p.payrollCycleId}`}
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
          {/* Mobile cards */}
          <ul className="block md:hidden divide-y divide-border">
            {items.map((p) => (
              <li key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/payroll/payslips/my/${p.payrollCycleId}`}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {p.payrollCycle ? `${MONTHS[p.payrollCycle.month - 1]} ${p.payrollCycle.year}` : 'Payslip'}
                  </Link>
                  {p.payrollCycle && <StatusBadge status={p.payrollCycle.status} />}
                </div>
                {p.payrollCycle && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(p.payrollCycle.periodStart)} — {formatDate(p.payrollCycle.periodEnd)}
                  </p>
                )}
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Gross</p>
                    <p className="font-medium text-success">{formatCurrency(p.grossEarnings)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Deductions</p>
                    <p className="font-medium text-destructive">{formatCurrency(p.totalDeductions)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Net</p>
                    <p className="font-bold text-foreground">{formatCurrency(p.netPayable)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
