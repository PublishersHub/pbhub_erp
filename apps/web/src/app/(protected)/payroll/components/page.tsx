'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { StatusBadge } from '@/components/ui/status-badge';
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
import {
  listSalaryComponents,
  createSalaryComponent,
  updateSalaryComponent,
  deactivateSalaryComponent,
} from '@/lib/payroll-api';
import type { SalaryComponentType, SalaryFormulaBase } from '@/types/payroll';

const FORMULA_OPTIONS: { value: SalaryFormulaBase; label: string }[] = [
  { value: 'FIXED', label: 'Fixed amount (typed per employee)' },
  { value: 'CTC', label: '% of CTC' },
  { value: 'BASIC', label: '% of BASIC' },
  { value: 'GROSS', label: '% of GROSS earnings' },
];

export default function SalaryComponentsPage() {
  useDocumentTitle('Salary Components');

  const confirm = useConfirm();
  const { can } = usePermission();
  const canManage = can('payroll.run');
  const { page, sort, order, pageSize, setPage, setSort } = useTableParams();

  const [search, setSearch] = useState('');

  const { data, error, errorStatus, loading, refetch } = useAsync(() => listSalaryComponents(), []);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q),
    );
  }, [data, search]);

  const sorted = useMemo(
    () =>
      sortLocal(filtered, sort, order, (item, key) => {
        switch (key) {
          case 'code':
            return item.code;
          case 'name':
            return item.name;
          case 'type':
            return item.type;
          case 'sortOrder':
            return item.sortOrder;
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

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<SalaryComponentType>('EARNING');
  const [description, setDescription] = useState('');
  const [isTaxable, setIsTaxable] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [sortOrderVal, setSortOrderVal] = useState('0');
  const [formulaBase, setFormulaBase] = useState<SalaryFormulaBase>('FIXED');
  const [formulaValue, setFormulaValue] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTaxable, setEditTaxable] = useState(false);
  const [editDefault, setEditDefault] = useState(false);
  const [editSort, setEditSort] = useState('0');
  const [editFormulaBase, setEditFormulaBase] = useState<SalaryFormulaBase>('FIXED');
  const [editFormulaValue, setEditFormulaValue] = useState('');

  function resetForm() {
    setName('');
    setCode('');
    setType('EARNING');
    setDescription('');
    setIsTaxable(false);
    setIsDefault(false);
    setSortOrderVal('0');
    setFormulaBase('FIXED');
    setFormulaValue('');
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setSubmitting(true);
    try {
      const isPercent = formulaBase !== 'FIXED';
      if (isPercent && (!formulaValue || isNaN(parseFloat(formulaValue)))) {
        throw new Error('Enter a percentage value for this formula');
      }
      await createSalaryComponent({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        ...(description.trim() && { description: description.trim() }),
        isTaxable,
        isDefault,
        sortOrder: parseInt(sortOrderVal, 10) || 0,
        formulaBase,
        ...(isPercent && { formulaValue: parseFloat(formulaValue) }),
      });
      setShowCreate(false);
      resetForm();
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(c: typeof items[number]) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditDesc(c.description ?? '');
    setEditTaxable(c.isTaxable);
    setEditDefault(c.isDefault);
    setEditSort(String(c.sortOrder));
    setEditFormulaBase(c.formulaBase ?? 'FIXED');
    setEditFormulaValue(c.formulaValue != null ? String(c.formulaValue) : '');
  }

  async function handleUpdate() {
    setFormError('');
    try {
      const isPercent = editFormulaBase !== 'FIXED';
      if (isPercent && (!editFormulaValue || isNaN(parseFloat(editFormulaValue)))) {
        throw new Error('Enter a percentage value for this formula');
      }
      await updateSalaryComponent(editingId, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        isTaxable: editTaxable,
        isDefault: editDefault,
        sortOrder: parseInt(editSort, 10) || 0,
        formulaBase: editFormulaBase,
        ...(isPercent
          ? { formulaValue: parseFloat(editFormulaValue) }
          : { formulaValue: 0 }),
      });
      setEditingId('');
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function handleDeactivate(id: string, name: string) {
    const ok = await confirm({
      title: 'Deactivate this component?',
      description: `"${name}" will be hidden from new salary structures, but existing structures and payrolls will keep referencing it.`,
      confirmLabel: 'Deactivate',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deactivateSalaryComponent(id);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to deactivate');
    }
  }

  const inputCls =
    'block w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50 transition-colors bg-card text-foreground';

  return (
    <div>
      <PageHeader
        title="Salary Components"
        actions={
          canManage && !showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium"
            >
              Add Component
            </button>
          ) : undefined
        }
      />

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-4 rounded-lg border border-border bg-card p-4 shadow-soft space-y-3">
          <h3 className="text-sm font-semibold text-foreground/80">New Salary Component</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-foreground/80">Code *</label>
              <input required value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} placeholder="e.g. BASIC" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80">Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Basic Salary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80">Type *</label>
              <select value={type} onChange={(e) => setType(e.target.value as SalaryComponentType)} className={inputCls}>
                <option value="EARNING">Earning</option>
                <option value="DEDUCTION">Deduction</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-foreground/80">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80">Sort Order</label>
              <input type="number" min={0} value={sortOrderVal} onChange={(e) => setSortOrderVal(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-foreground/80">Formula</label>
              <select
                value={formulaBase}
                onChange={(e) => setFormulaBase(e.target.value as SalaryFormulaBase)}
                className={inputCls}
              >
                {FORMULA_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Fixed components are typed per employee. % formulas are auto-computed from CTC.
              </p>
            </div>
            {formulaBase !== 'FIXED' && (
              <div>
                <label className="block text-xs font-medium text-foreground/80">Percentage *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={formulaValue}
                  onChange={(e) => setFormulaValue(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. 60 for 60%"
                />
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground/80">
              <input type="checkbox" checked={isTaxable} onChange={(e) => setIsTaxable(e.target.checked)} className="rounded border-gray-300" />
              Taxable
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded border-gray-300" />
              Default
            </label>
          </div>
          {formError && <ErrorMessage message={formError} />}
          <div className="flex gap-2">
            <LoadingButton type="submit" loading={submitting} loadingText="Creating...">
              Create
            </LoadingButton>
            <LoadingButton type="button" variant="secondary" onClick={() => { setShowCreate(false); resetForm(); }}>
              Cancel
            </LoadingButton>
          </div>
        </form>
      )}

      {!showCreate && formError && (
        <div className="mb-4"><ErrorMessage message={formError} /></div>
      )}

      {data && data.length > 0 && (
        <div className="mb-3">
          <TableSearch value={search} onChange={setSearch} placeholder="Search components…" />
        </div>
      )}

      {loading && <Loading />}
      {error && <ErrorMessage message={error} status={errorStatus} onRetry={refetch} />}
      {data && total === 0 && (
        <EmptyState
          title={search ? 'No components match your search' : 'No salary components'}
          description={search ? 'Try a different search term.' : 'Create salary components to define earnings and deductions.'}
          variant={search ? 'search' : 'default'}
          {...(canManage && !search ? { cta: { label: 'Add Component', onClick: () => setShowCreate(true) } } : {})}
        />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <SortableHeader label="Code" sortKey="code" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Name" sortKey="name" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Type" sortKey="type" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Formula</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Taxable</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Default</th>
                  <SortableHeader label="Order" sortKey="sortOrder" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                  {canManage && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((c) =>
                  editingId === c.id ? (
                    <tr key={c.id} className="bg-primary-soft">
                      <td className="px-4 py-2 text-sm font-medium text-foreground">{c.code}</td>
                      <td className="px-4 py-2">
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded border border-input px-2 py-1 text-sm w-full bg-card text-foreground" />
                      </td>
                      <td className="px-4 py-2"><StatusBadge status={c.type} /></td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col gap-1">
                          <select
                            value={editFormulaBase}
                            onChange={(e) => setEditFormulaBase(e.target.value as SalaryFormulaBase)}
                            className="rounded border border-input px-1.5 py-0.5 text-xs bg-card text-foreground"
                          >
                            {FORMULA_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.value}</option>
                            ))}
                          </select>
                          {editFormulaBase !== 'FIXED' && (
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={editFormulaValue}
                              onChange={(e) => setEditFormulaValue(e.target.value)}
                              className="w-20 rounded border border-input px-1.5 py-0.5 text-xs bg-card text-foreground"
                              placeholder="%"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input type="checkbox" checked={editTaxable} onChange={(e) => setEditTaxable(e.target.checked)} className="rounded border-gray-300" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="checkbox" checked={editDefault} onChange={(e) => setEditDefault(e.target.checked)} className="rounded border-gray-300" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min={0} value={editSort} onChange={(e) => setEditSort(e.target.value)} className="w-16 rounded border border-input px-2 py-1 text-sm bg-card text-foreground" />
                      </td>
                      <td className="px-4 py-2" />
                      <td className="px-4 py-2 flex gap-1">
                        <button onClick={handleUpdate} className="rounded bg-success-soft text-success px-2 py-1 text-xs hover:bg-success/20">Save</button>
                        <button onClick={() => setEditingId('')} className="rounded bg-secondary text-secondary-foreground px-2 py-1 text-xs hover:bg-secondary/80">Cancel</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={c.id} className="hover:bg-muted/50 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">{c.code}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">{c.name}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.type} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {c.formulaBase === 'FIXED'
                          ? 'Fixed'
                          : `${c.formulaValue ?? '0'}% of ${c.formulaBase}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{c.isTaxable ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{c.isDefault ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{c.sortOrder}</td>
                      <td className="px-4 py-3">
                        {c.isActive ? (
                          <span className="inline-flex items-center rounded-full bg-success-soft text-success px-2.5 py-0.5 text-xs font-medium">Active</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-xs font-medium">Inactive</span>
                        )}
                      </td>
                      {canManage && (
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <div className="flex gap-1">
                            <button onClick={() => startEdit(c)} className="rounded bg-primary-soft text-primary px-2 py-1 text-xs hover:bg-primary/20">Edit</button>
                            {c.isActive && (
                              <button onClick={() => handleDeactivate(c.id, c.name)} className="rounded bg-destructive-soft text-destructive px-2 py-1 text-xs hover:bg-destructive/20">Deactivate</button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
