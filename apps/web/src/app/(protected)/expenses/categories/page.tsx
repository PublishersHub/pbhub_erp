'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import {
  useAsync,
  usePermission,
  useTableParams,
  sortLocal,
  paginateLocal,
} from '@/lib/hooks';
import {
  listExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
} from '@/lib/expense-api';

export default function ExpenseCategoriesPage() {
  const { can } = usePermission();
  const canManage = can('expense.manage');
  const { page, sort, order, pageSize, setPage, setSort } = useTableParams();

  const { data, error, loading, refetch } = useAsync(() => listExpenseCategories(), []);

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'code':
            return item.code;
          case 'name':
            return item.name;
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
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit form
  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setSubmitting(true);
    try {
      await createExpenseCategory({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        ...(description.trim() && { description: description.trim() }),
      });
      setShowCreate(false);
      setName('');
      setCode('');
      setDescription('');
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
  }

  async function handleUpdate() {
    setFormError('');
    try {
      await updateExpenseCategory(editingId, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      });
      setEditingId('');
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await updateExpenseCategory(id, { isActive: false });
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
        title="Expense Categories"
        actions={
          canManage && !showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Category
            </button>
          ) : undefined
        }
      />

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-gray-700">Code *</label>
            <input required value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} placeholder="TRAVEL" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Name *</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Travel" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="Optional" />
          </div>
          <button type="submit" disabled={submitting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create'}
          </button>
          <button type="button" onClick={() => { setShowCreate(false); setName(''); setCode(''); setDescription(''); }} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
            Cancel
          </button>
        </form>
      )}

      {formError && (
        <div className="mb-4"><ErrorMessage message={formError} /></div>
      )}

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && total === 0 && (
        <EmptyState title="No categories" description="Create expense categories to classify expenses." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Code" sortKey="code" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Name" sortKey="name" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
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
                      <td className="px-4 py-2">
                        <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-sm w-full" />
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
                      <td className="px-4 py-3 text-sm text-gray-600">{c.description || '—'}</td>
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
