'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { StatusBadge } from '@/components/ui/status-badge';
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
import type { SalaryComponentType } from '@/types/payroll';

export default function SalaryComponentsPage() {
  const { can } = usePermission();
  const canManage = can('payroll.run');
  const { page, sort, order, pageSize, setPage, setSort } = useTableParams();

  const { data, error, loading, refetch } = useAsync(() => listSalaryComponents(), []);

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
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
    [data, sort, order],
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
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTaxable, setEditTaxable] = useState(false);
  const [editDefault, setEditDefault] = useState(false);
  const [editSort, setEditSort] = useState('0');

  function resetForm() {
    setName('');
    setCode('');
    setType('EARNING');
    setDescription('');
    setIsTaxable(false);
    setIsDefault(false);
    setSortOrderVal('0');
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setSubmitting(true);
    try {
      await createSalaryComponent({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        ...(description.trim() && { description: description.trim() }),
        isTaxable,
        isDefault,
        sortOrder: parseInt(sortOrderVal, 10) || 0,
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
  }

  async function handleUpdate() {
    setFormError('');
    try {
      await updateSalaryComponent(editingId, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        isTaxable: editTaxable,
        isDefault: editDefault,
        sortOrder: parseInt(editSort, 10) || 0,
      });
      setEditingId('');
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await deactivateSalaryComponent(id);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to deactivate');
    }
  }

  const inputCls =
    'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div>
      <PageHeader
        title="Salary Components"
        actions={
          canManage && !showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Component
            </button>
          ) : undefined
        }
      />

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-4 rounded-lg border bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">New Salary Component</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-700">Code *</label>
              <input required value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} placeholder="e.g. BASIC" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Basic Salary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Type *</label>
              <select value={type} onChange={(e) => setType(e.target.value as SalaryComponentType)} className={inputCls}>
                <option value="EARNING">Earning</option>
                <option value="DEDUCTION">Deduction</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Sort Order</label>
              <input type="number" min={0} value={sortOrderVal} onChange={(e) => setSortOrderVal(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
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
            <button type="submit" disabled={submitting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); resetForm(); }} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
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
        <EmptyState title="No salary components" description="Create salary components to define earnings and deductions." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Code" sortKey="code" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Name" sortKey="name" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Type" sortKey="type" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Taxable</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Default</th>
                  <SortableHeader label="Order" sortKey="sortOrder" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  {canManage && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((c) =>
                  editingId === c.id ? (
                    <tr key={c.id} className="bg-blue-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{c.code}</td>
                      <td className="px-4 py-2">
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-sm w-full" />
                      </td>
                      <td className="px-4 py-2"><StatusBadge status={c.type} /></td>
                      <td className="px-4 py-2">
                        <input type="checkbox" checked={editTaxable} onChange={(e) => setEditTaxable(e.target.checked)} className="rounded border-gray-300" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="checkbox" checked={editDefault} onChange={(e) => setEditDefault(e.target.checked)} className="rounded border-gray-300" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min={0} value={editSort} onChange={(e) => setEditSort(e.target.value)} className="w-16 rounded border border-gray-300 px-2 py-1 text-sm" />
                      </td>
                      <td className="px-4 py-2" />
                      <td className="px-4 py-2 flex gap-1">
                        <button onClick={handleUpdate} className="rounded bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100">Save</button>
                        <button onClick={() => setEditingId('')} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200">Cancel</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{c.code}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{c.name}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.type} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.isTaxable ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.isDefault ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.sortOrder}</td>
                      <td className="px-4 py-3">
                        {c.isActive ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Active</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">Inactive</span>
                        )}
                      </td>
                      {canManage && (
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <div className="flex gap-1">
                            <button onClick={() => startEdit(c)} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100">Edit</button>
                            {c.isActive && (
                              <button onClick={() => handleDeactivate(c.id)} className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100">Deactivate</button>
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
