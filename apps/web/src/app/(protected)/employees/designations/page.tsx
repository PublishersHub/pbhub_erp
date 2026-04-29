'use client';

import { useState, useMemo, type FormEvent } from 'react';
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
  listDesignations,
  createDesignation,
  updateDesignation,
  deactivateDesignation,
} from '@/lib/employee-api';
import type { Designation } from '@/types/employee';

export default function DesignationsPage() {
  const { can } = usePermission();
  const { page, sort, order, pageSize, setPage, setSort } = useTableParams();
  const { data, error, loading, refetch } = useAsync(() => listDesignations(), []);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [level, setLevel] = useState('0');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit inline
  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [editLevel, setEditLevel] = useState('0');

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'name':
            return item.name;
          case 'level':
            return item.level;
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

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setSubmitting(true);
    try {
      await createDesignation({
        name: name.trim(),
        ...(level && { level: parseInt(level, 10) }),
      });
      setShowCreate(false);
      setName('');
      setLevel('0');
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create designation');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(desig: Designation) {
    setFormError('');
    setSubmitting(true);
    try {
      await updateDesignation(desig.id, {
        name: editName.trim(),
        level: parseInt(editLevel, 10),
      });
      setEditingId('');
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    setFormError('');
    try {
      await deactivateDesignation(id);
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
        title="Designations"
        backHref="/employees"
        actions={
          can('employee.create') && !showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Designation
            </button>
          ) : undefined
        }
      />

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 shadow-sm"
        >
          <div>
            <label className="block text-xs font-medium text-gray-700">Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="e.g. Senior Engineer"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Level</label>
            <input
              type="number"
              min={0}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className={inputCls}
              placeholder="0"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreate(false);
              setName('');
              setLevel('0');
            }}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
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
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && total === 0 && (
        <EmptyState
          title="No designations found"
          description="Create your first designation."
        />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader
                    label="Name"
                    sortKey="name"
                    currentSort={sort}
                    currentOrder={order}
                    onSort={setSort}
                  />
                  <SortableHeader
                    label="Level"
                    sortKey="level"
                    currentSort={sort}
                    currentOrder={order}
                    onSort={setSort}
                  />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                  {can('employee.update') && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((desig) => (
                  <tr key={desig.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {editingId === desig.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className="font-medium text-gray-900">{desig.name}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {editingId === desig.id ? (
                        <input
                          type="number"
                          min={0}
                          value={editLevel}
                          onChange={(e) => setEditLevel(e.target.value)}
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        desig.level
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {desig.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    {can('employee.update') && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {editingId === desig.id ? (
                          <div className="flex gap-1">
                            <button
                              disabled={submitting}
                              onClick={() => handleUpdate(desig)}
                              className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId('')}
                              className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingId(desig.id);
                                setEditName(desig.name);
                                setEditLevel(String(desig.level));
                              }}
                              className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                            >
                              Edit
                            </button>
                            {can('employee.delete') && desig.isActive && (
                              <button
                                onClick={() => handleDeactivate(desig.id)}
                                className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                              >
                                Deactivate
                              </button>
                            )}
                          </div>
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
    </div>
  );
}
