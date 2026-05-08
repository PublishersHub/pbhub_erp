'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { TableSearch } from '@/components/ui/table-search';
import { LoadingButton } from '@/components/ui/loading-button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  useAsync,
  usePermission,
  useTableParams,
  sortLocal,
  paginateLocal,
} from '@/lib/hooks';
import { listHolidays, createHoliday, deactivateHoliday } from '@/lib/leave-api';
import { formatDate } from '@/lib/format';

export default function HolidaysPage() {
  const { can } = usePermission();
  const confirm = useConfirm();
  const canManage = can('leave.manage');
  const currentYear = new Date().getFullYear();
  const [search, setSearch] = useState('');

  useDocumentTitle('Holidays');
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();
  const yearFilter = searchParams.get('year') || '';

  const { data, error, errorStatus, loading, refetch } = useAsync(
    () => listHolidays(yearFilter ? parseInt(yearFilter, 10) : undefined),
    [yearFilter],
  );

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [isOptional, setIsOptional] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const arr = data ?? [];
    if (!search.trim()) return arr;
    const q = search.trim().toLowerCase();
    return arr.filter((h) => h.name.toLowerCase().includes(q));
  }, [data, search]);

  const sorted = useMemo(
    () =>
      sortLocal(filtered, sort, order, (item, key) => {
        switch (key) {
          case 'name':
            return item.name;
          case 'date':
            return item.date;
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

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setSubmitting(true);
    try {
      await createHoliday({
        name: name.trim(),
        date,
        ...(isOptional && { isOptional }),
      });
      setShowCreate(false);
      setName('');
      setDate('');
      setIsOptional(false);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create holiday');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(id: string, name: string) {
    const ok = await confirm({
      title: 'Deactivate holiday?',
      description: `"${name}" will no longer be observed.`,
      confirmLabel: 'Deactivate',
      cancelLabel: 'Keep active',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deactivateHoliday(id);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to deactivate');
    }
  }

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear + 1; y >= currentYear - 3; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  const inputCls =
    'block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';

  return (
    <div>
      <PageHeader
        title="Holidays"
        actions={
          canManage && !showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium"
            >
              Add Holiday
            </button>
          ) : undefined
        }
      />

      <FilterBar
        onClear={() => { setSearch(''); setParams({ year: null, page: null }); }}
        hasActiveFilters={!!yearFilter || !!search}
      >
        <select
          value={yearFilter}
          onChange={(e) => setParams({ year: e.target.value || null, page: null })}
          className="rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors"
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search holiday name…"
          className="min-w-[14rem] flex-1"
        />
      </FilterBar>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 shadow-soft"
        >
          <div>
            <label className="block text-xs font-medium text-foreground/80">Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="e.g. New Year"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/80">Date *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground/80">
            <input
              type="checkbox"
              checked={isOptional}
              onChange={(e) => setIsOptional(e.target.checked)}
              className="rounded border-input"
            />
            Optional
          </label>
          <LoadingButton type="submit" loading={submitting} loadingText="Creating…">
            Create
          </LoadingButton>
          <button
            type="button"
            onClick={() => {
              setShowCreate(false);
              setName('');
              setDate('');
              setIsOptional(false);
            }}
            className="rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 motion-press transition-colors px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
        </form>
      )}

      {formError && (
        <div className="mb-4">
          <ErrorMessage message={formError} />
        </div>
      )}

      {loading && <Loading />}
      {error && <ErrorMessage message={error} status={errorStatus} onRetry={refetch} fallback={{ label: 'View my requests', href: '/leave/requests' }} />}
      {data && total === 0 && (
        <EmptyState
          variant="leave"
          title="No holidays found"
          description={search ? 'No holidays match your search.' : 'Add holidays so the leave calendar reflects them.'}
          cta={
            canManage && !search
              ? { label: 'Add Holiday', onClick: () => setShowCreate(true) }
              : undefined
          }
        />
      )}
      {data && total > 0 && (
        <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-soft md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <SortableHeader
                    label="Name"
                    sortKey="name"
                    currentSort={sort}
                    currentOrder={order}
                    onSort={setSort}
                  />
                  <SortableHeader
                    label="Date"
                    sortKey="date"
                    currentSort={sort}
                    currentOrder={order}
                    onSort={setSort}
                  />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Status
                  </th>
                  {canManage && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((h) => (
                  <tr key={h.id} className="hover:bg-muted/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                      {h.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(h.date)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {h.isOptional ? (
                        <span className="inline-flex items-center rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">
                          Optional
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                          Mandatory
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {h.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                          Inactive
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {h.isActive && (
                          <button
                            onClick={() => handleDeactivate(h.id, h.name)}
                            className="rounded bg-destructive-soft text-destructive hover:bg-destructive/20 transition-colors px-2 py-1 text-xs font-medium"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    )}
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

      {/* Mobile cards */}
      {data && total > 0 && (
        <div className="block space-y-3 md:hidden">
          {items.map((h) => (
            <div key={h.id} className="rounded-lg border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{h.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(h.date)}</p>
                </div>
                {h.isOptional ? (
                  <span className="inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">Optional</span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">Mandatory</span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                {h.isActive ? (
                  <span className="inline-flex items-center rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Active</span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">Inactive</span>
                )}
                {canManage && h.isActive && (
                  <button
                    onClick={() => handleDeactivate(h.id, h.name)}
                    className="rounded bg-destructive-soft px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
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
