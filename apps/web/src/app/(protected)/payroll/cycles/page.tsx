'use client';

import { useMemo, useState, type FormEvent } from 'react';
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
import { listPayrollCycles, createPayrollCycle } from '@/lib/payroll-api';
import { formatCurrency, formatDate } from '@/lib/format';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function PayrollCyclesPage() {
  const { can } = usePermission();
  const canRun = can('payroll.run');
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();

  const yearFilter = searchParams.get('year') || '';

  const { data, error, loading, refetch } = useAsync(
    () => listPayrollCycles(yearFilter ? parseInt(yearFilter, 10) : undefined),
    [yearFilter],
  );

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'period':
            return `${item.year}-${String(item.month).padStart(2, '0')}`;
          case 'status':
            return item.status;
          case 'employees':
            return item.employeeCount ?? 0;
          case 'net':
            return item.totalNet ? parseFloat(item.totalNet) : 0;
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

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const now = new Date();
  const [createYear, setCreateYear] = useState(String(now.getFullYear()));
  const [createMonth, setCreateMonth] = useState(String(now.getMonth() + 1));
  const [createNotes, setCreateNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setSubmitting(true);
    try {
      await createPayrollCycle({
        year: parseInt(createYear, 10),
        month: parseInt(createMonth, 10),
        ...(createNotes.trim() && { notes: createNotes.trim() }),
      });
      setShowCreate(false);
      setCreateNotes('');
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create cycle');
    } finally {
      setSubmitting(false);
    }
  }

  const currentYear = now.getFullYear();
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear + 1; y >= currentYear - 3; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  const inputCls =
    'block w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50 transition-colors bg-card text-foreground';

  return (
    <div>
      <PageHeader
        title="Payroll Cycles"
        actions={
          canRun && !showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium"
            >
              Create Cycle
            </button>
          ) : undefined
        }
      />

      <FilterBar
        onClear={() => setParams({ year: null, page: null })}
        hasActiveFilters={!!yearFilter}
      >
        <select
          value={yearFilter}
          onChange={(e) => setParams({ year: e.target.value || null, page: null })}
          className="rounded-md border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none bg-card text-foreground"
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </FilterBar>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-4 rounded-lg border border-border bg-card p-4 shadow-soft space-y-3">
          <h3 className="text-sm font-semibold text-foreground/80">New Payroll Cycle</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-foreground/80">Year *</label>
              <select value={createYear} onChange={(e) => setCreateYear(e.target.value)} className={inputCls}>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80">Month *</label>
              <select value={createMonth} onChange={(e) => setCreateMonth(e.target.value)} className={inputCls}>
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80">Notes</label>
              <input value={createNotes} onChange={(e) => setCreateNotes(e.target.value)} className={inputCls} placeholder="Optional" />
            </div>
          </div>
          {formError && <ErrorMessage message={formError} />}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); setFormError(''); }} className="rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 motion-press transition-colors px-4 py-2 text-sm font-medium">
              Cancel
            </button>
          </div>
        </form>
      )}

      {!showCreate && formError && (
        <div className="mb-4"><ErrorMessage message={formError} /></div>
      )}

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && total === 0 && (
        <EmptyState title="No payroll cycles" description="Create a payroll cycle to get started." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <SortableHeader label="Period" sortKey="period" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Status" sortKey="status" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Dates</th>
                  <SortableHeader label="Employees" sortKey="employees" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Gross</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Deductions</th>
                  <SortableHeader label="Net" sortKey="net" currentSort={sort} currentOrder={order} onSort={setSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-primary">
                      <Link href={`/payroll/cycles/${c.id}`} className="hover:underline font-medium">
                        {MONTHS[c.month - 1]} {c.year}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(c.periodStart)} — {formatDate(c.periodEnd)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">{c.employeeCount ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-muted-foreground">{c.totalGross ? formatCurrency(c.totalGross) : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-destructive">{c.totalDeductions ? formatCurrency(c.totalDeductions) : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-medium text-foreground">{c.totalNet ? formatCurrency(c.totalNet) : '—'}</td>
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
