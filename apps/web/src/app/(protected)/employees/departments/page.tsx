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
  listDepartments,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
} from '@/lib/employee-api';
import type { Department } from '@/types/employee';

export default function DepartmentsPage() {
  const { can } = usePermission();
  const { page, sort, order, pageSize, setPage, setSort } = useTableParams();
  const { data, error, loading, refetch } = useAsync(() => listDepartments(), []);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [parentId, setParentId] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit inline
  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'name':
            return item.name;
          case 'code':
            return item.code;
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
      await createDepartment({
        name: name.trim(),
        code: code.trim(),
        ...(parentId && { parentId }),
      });
      setShowCreate(false);
      setName('');
      setCode('');
      setParentId('');
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create department');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(dept: Department) {
    setFormError('');
    setSubmitting(true);
    try {
      await updateDepartment(dept.id, {
        name: editName.trim(),
        code: editCode.trim(),
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
      await deactivateDepartment(id);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to deactivate');
    }
  }

  const inputCls =
    'block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';

  return (
    <div>
      <PageHeader
        title="Departments"
        backHref="/employees"
        actions={
          can('employee.create') && !showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium"
            >
              Add Department
            </button>
          ) : undefined
        }
      />

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
              placeholder="Engineering"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/80">Code *</label>
            <input
              required
              maxLength={20}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputCls}
              placeholder="ENG"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/80">Parent</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className={inputCls}
            >
              <option value="">None</option>
              {(data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreate(false);
              setName('');
              setCode('');
              setParentId('');
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
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && total === 0 && (
        <EmptyState title="No departments found" description="Create your first department." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
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
                    label="Code"
                    sortKey="code"
                    currentSort={sort}
                    currentOrder={order}
                    onSort={setSort}
                  />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Parent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Status
                  </th>
                  {can('employee.update') && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((dept) => (
                  <tr key={dept.id} className="hover:bg-muted/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {editingId === dept.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rounded border border-input bg-card text-foreground px-2 py-1 text-sm focus:border-primary focus:ring-2 focus:ring-ring/50 transition-colors"
                        />
                      ) : (
                        <span className="font-medium text-foreground">{dept.name}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {editingId === dept.id ? (
                        <input
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          className="rounded border border-input bg-card text-foreground px-2 py-1 text-sm focus:border-primary focus:ring-2 focus:ring-ring/50 transition-colors"
                        />
                      ) : (
                        dept.code
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {dept.parent?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {dept.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                          Inactive
                        </span>
                      )}
                    </td>
                    {can('employee.update') && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {editingId === dept.id ? (
                          <div className="flex gap-1">
                            <button
                              disabled={submitting}
                              onClick={() => handleUpdate(dept)}
                              className="rounded bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-2 py-1 text-xs font-medium disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId('')}
                              className="rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 motion-press transition-colors px-2 py-1 text-xs font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingId(dept.id);
                                setEditName(dept.name);
                                setEditCode(dept.code);
                              }}
                              className="rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 motion-press transition-colors px-2 py-1 text-xs font-medium"
                            >
                              Edit
                            </button>
                            {can('employee.delete') && dept.isActive && (
                              <button
                                onClick={() => handleDeactivate(dept.id)}
                                className="rounded bg-destructive-soft text-destructive hover:bg-destructive/20 transition-colors px-2 py-1 text-xs font-medium"
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
