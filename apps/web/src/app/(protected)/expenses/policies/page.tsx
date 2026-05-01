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
  listExpensePolicies,
  createExpensePolicy,
  updateExpensePolicy,
} from '@/lib/expense-api';
import { formatCurrency } from '@/lib/format';

export default function ExpensePoliciesPage() {
  const { can } = usePermission();
  const canManage = can('expense.manage');
  const { page, sort, order, pageSize, setPage, setSort } = useTableParams();

  const { data, error, loading, refetch } = useAsync(() => listExpensePolicies(), []);

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'name':
            return item.name;
          case 'maxClaim':
            return item.maxClaimAmount ? parseFloat(item.maxClaimAmount) : 0;
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
  const [maxClaim, setMaxClaim] = useState('');
  const [maxItem, setMaxItem] = useState('');
  const [receiptAbove, setReceiptAbove] = useState('');
  const [autoBelow, setAutoBelow] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit form
  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [editMaxClaim, setEditMaxClaim] = useState('');
  const [editMaxItem, setEditMaxItem] = useState('');
  const [editReceiptAbove, setEditReceiptAbove] = useState('');
  const [editAutoBelow, setEditAutoBelow] = useState('');

  function resetForm() {
    setName('');
    setMaxClaim('');
    setMaxItem('');
    setReceiptAbove('');
    setAutoBelow('');
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setSubmitting(true);
    try {
      await createExpensePolicy({
        name: name.trim(),
        ...(maxClaim && { maxClaimAmount: parseFloat(maxClaim) }),
        ...(maxItem && { maxItemAmount: parseFloat(maxItem) }),
        ...(receiptAbove && { receiptRequiredAbove: parseFloat(receiptAbove) }),
        ...(autoBelow && { autoApproveBelow: parseFloat(autoBelow) }),
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

  function startEdit(p: typeof items[number]) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditMaxClaim(p.maxClaimAmount ?? '');
    setEditMaxItem(p.maxItemAmount ?? '');
    setEditReceiptAbove(p.receiptRequiredAbove ?? '');
    setEditAutoBelow(p.autoApproveBelow ?? '');
  }

  async function handleUpdate() {
    setFormError('');
    try {
      await updateExpensePolicy(editingId, {
        name: editName.trim(),
        ...(editMaxClaim ? { maxClaimAmount: parseFloat(editMaxClaim) } : {}),
        ...(editMaxItem ? { maxItemAmount: parseFloat(editMaxItem) } : {}),
        ...(editReceiptAbove ? { receiptRequiredAbove: parseFloat(editReceiptAbove) } : {}),
        ...(editAutoBelow ? { autoApproveBelow: parseFloat(editAutoBelow) } : {}),
      });
      setEditingId('');
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await updateExpensePolicy(id, { isActive: false });
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
        title="Expense Policies"
        actions={
          canManage && !showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium"
            >
              Create Policy
            </button>
          ) : undefined
        }
      />

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-4 rounded-lg border border-border bg-card p-4 shadow-soft space-y-3">
          <h3 className="text-sm font-semibold text-foreground/80">New Expense Policy</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-foreground/80">Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Standard Expense Policy" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80">Max Claim Amount</label>
              <input type="number" min={0} step="0.01" value={maxClaim} onChange={(e) => setMaxClaim(e.target.value)} className={inputCls} placeholder="No limit" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80">Max Item Amount</label>
              <input type="number" min={0} step="0.01" value={maxItem} onChange={(e) => setMaxItem(e.target.value)} className={inputCls} placeholder="No limit" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80">Receipt Required Above</label>
              <input type="number" min={0} step="0.01" value={receiptAbove} onChange={(e) => setReceiptAbove(e.target.value)} className={inputCls} placeholder="Always optional" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80">Auto-approve Below</label>
              <input type="number" min={0} step="0.01" value={autoBelow} onChange={(e) => setAutoBelow(e.target.value)} className={inputCls} placeholder="Never" />
            </div>
          </div>
          {formError && <ErrorMessage message={formError} />}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); resetForm(); }} className="rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 motion-press transition-colors px-4 py-2 text-sm font-medium">
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
        <EmptyState title="No policies" description="Create expense policies to define spending limits." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <SortableHeader label="Name" sortKey="name" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Max Claim" sortKey="maxClaim" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Max Item</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Receipt Above</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Auto-approve Below</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                  {canManage && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((p) =>
                  editingId === p.id ? (
                    <tr key={p.id} className="bg-primary-soft">
                      <td className="px-4 py-2">
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded border border-input px-2 py-1 text-sm w-full bg-card text-foreground" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min={0} step="0.01" value={editMaxClaim} onChange={(e) => setEditMaxClaim(e.target.value)} className="w-28 rounded border border-input px-2 py-1 text-sm text-right bg-card text-foreground" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min={0} step="0.01" value={editMaxItem} onChange={(e) => setEditMaxItem(e.target.value)} className="w-28 rounded border border-input px-2 py-1 text-sm text-right bg-card text-foreground" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min={0} step="0.01" value={editReceiptAbove} onChange={(e) => setEditReceiptAbove(e.target.value)} className="w-28 rounded border border-input px-2 py-1 text-sm text-right bg-card text-foreground" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min={0} step="0.01" value={editAutoBelow} onChange={(e) => setEditAutoBelow(e.target.value)} className="w-28 rounded border border-input px-2 py-1 text-sm text-right bg-card text-foreground" />
                      </td>
                      <td className="px-4 py-2" />
                      <td className="px-4 py-2 flex gap-1">
                        <button onClick={handleUpdate} className="rounded bg-success-soft text-success px-2 py-1 text-xs hover:bg-success/20">Save</button>
                        <button onClick={() => setEditingId('')} className="rounded bg-secondary text-secondary-foreground px-2 py-1 text-xs hover:bg-secondary/80">Cancel</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">{p.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-foreground">{p.maxClaimAmount ? formatCurrency(p.maxClaimAmount) : '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-muted-foreground">{p.maxItemAmount ? formatCurrency(p.maxItemAmount) : '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-muted-foreground">{p.receiptRequiredAbove ? formatCurrency(p.receiptRequiredAbove) : '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-muted-foreground">{p.autoApproveBelow ? formatCurrency(p.autoApproveBelow) : '—'}</td>
                      <td className="px-4 py-3">
                        {p.isActive ? (
                          <span className="inline-flex items-center rounded-full bg-success-soft text-success px-2.5 py-0.5 text-xs font-medium">Active</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-xs font-medium">Inactive</span>
                        )}
                      </td>
                      {canManage && (
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <div className="flex gap-1">
                            <button onClick={() => startEdit(p)} className="rounded bg-primary-soft text-primary px-2 py-1 text-xs hover:bg-primary/20">Edit</button>
                            {p.isActive && (
                              <button onClick={() => handleDeactivate(p.id)} className="rounded bg-destructive-soft text-destructive px-2 py-1 text-xs hover:bg-destructive/20">Deactivate</button>
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
