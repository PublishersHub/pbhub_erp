'use client';

import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { LoadingButton } from '@/components/ui/loading-button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/toast';
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
  useDocumentTitle('Designations');

  const { can } = usePermission();
  const confirm = useConfirm();
  const toast = useToast();
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

  async function handleDeactivate(desig: Designation) {
    const ok = await confirm({
      title: 'Deactivate designation?',
      description: `This will deactivate "${desig.name}". Existing employees keep their assignment but the designation won't appear in pickers.`,
      confirmLabel: 'Deactivate',
      tone: 'warning',
    });
    if (!ok) return;
    setFormError('');
    try {
      await deactivateDesignation(desig.id);
      toast.success('Designation deactivated', desig.name);
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate';
      setFormError(msg);
      toast.error('Failed to deactivate', msg);
    }
  }

  const inputCls =
    'block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';

  return (
    <div>
      <PageHeader
        title="Designations"
        backHref="/employees"
        actions={
          can('employee.create') && !showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium"
            >
              Add Designation
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
              placeholder="e.g. Senior Engineer"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/80">Level</label>
            <input
              type="number"
              min={0}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className={inputCls}
              placeholder="0"
            />
          </div>
          <LoadingButton type="submit" loading={submitting} loadingText="Creating…">
            Create
          </LoadingButton>
          <button
            type="button"
            onClick={() => {
              setShowCreate(false);
              setName('');
              setLevel('0');
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
        <EmptyState
          title="No designations found"
          description="Create your first designation."
          cta={
            can('employee.create')
              ? { label: 'Add designation', onClick: () => setShowCreate(true) }
              : undefined
          }
        />
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
                    label="Level"
                    sortKey="level"
                    currentSort={sort}
                    currentOrder={order}
                    onSort={setSort}
                  />
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
                {items.map((desig) => (
                  <tr key={desig.id} className="hover:bg-muted/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {editingId === desig.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rounded border border-input bg-card text-foreground px-2 py-1 text-sm focus:border-primary focus:ring-2 focus:ring-ring/50 transition-colors"
                        />
                      ) : (
                        <span className="font-medium text-foreground">{desig.name}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {editingId === desig.id ? (
                        <input
                          type="number"
                          min={0}
                          value={editLevel}
                          onChange={(e) => setEditLevel(e.target.value)}
                          className="w-20 rounded border border-input bg-card text-foreground px-2 py-1 text-sm focus:border-primary focus:ring-2 focus:ring-ring/50 transition-colors"
                        />
                      ) : (
                        desig.level
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {desig.isActive ? (
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
                        {editingId === desig.id ? (
                          <div className="flex gap-1">
                            <button
                              disabled={submitting}
                              onClick={() => handleUpdate(desig)}
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
                                setEditingId(desig.id);
                                setEditName(desig.name);
                                setEditLevel(String(desig.level));
                              }}
                              className="rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 motion-press transition-colors px-2 py-1 text-xs font-medium"
                            >
                              Edit
                            </button>
                            {can('employee.delete') && desig.isActive && (
                              <button
                                onClick={() => handleDeactivate(desig)}
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
