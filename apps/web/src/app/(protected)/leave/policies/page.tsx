'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
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
import { listLeavePolicies, createLeavePolicy, deactivateLeavePolicy } from '@/lib/leave-api';

export default function LeavePoliciesPage() {
  const { can } = usePermission();
  const confirm = useConfirm();
  const canManage = can('leave.manage');
  const { page, sort, order, pageSize, setPage, setSort } = useTableParams();
  const { data, error, errorStatus, loading, refetch } = useAsync(() => listLeavePolicies(), []);
  const [search, setSearch] = useState('');

  useEffect(() => {
    document.title = 'Leave Policies · PbHub';
  }, []);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [annualQuota, setAnnualQuota] = useState('12');
  const [carryForward, setCarryForward] = useState('0');
  const [maxConsecutive, setMaxConsecutive] = useState('');
  const [allowHalfDay, setAllowHalfDay] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [isPaid, setIsPaid] = useState(true);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const arr = data ?? [];
    if (!search.trim()) return arr;
    const q = search.trim().toLowerCase();
    return arr.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q),
    );
  }, [data, search]);

  const sorted = useMemo(
    () =>
      sortLocal(filtered, sort, order, (item, key) => {
        switch (key) {
          case 'name':
            return item.name;
          case 'code':
            return item.code;
          case 'quota':
            return parseFloat(item.annualQuotaDefault);
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
      await createLeavePolicy({
        name: name.trim(),
        code: code.trim(),
        ...(description.trim() && { description: description.trim() }),
        annualQuotaDefault: parseFloat(annualQuota),
        ...(carryForward && { carryForwardLimit: parseFloat(carryForward) }),
        ...(maxConsecutive && { maxConsecutiveDays: parseInt(maxConsecutive, 10) }),
        allowHalfDay,
        requiresApproval,
        isPaid,
      });
      resetForm();
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create policy');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setShowCreate(false);
    setName('');
    setCode('');
    setDescription('');
    setAnnualQuota('12');
    setCarryForward('0');
    setMaxConsecutive('');
    setAllowHalfDay(true);
    setRequiresApproval(true);
    setIsPaid(true);
  }

  async function handleDeactivate(id: string, name: string) {
    const ok = await confirm({
      title: 'Deactivate this policy?',
      description: `"${name}" will no longer be available to assign or use.`,
      confirmLabel: 'Deactivate',
      cancelLabel: 'Keep active',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deactivateLeavePolicy(id);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to deactivate');
    }
  }

  const inputCls =
    'mt-1 block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';
  const labelCls = 'block text-sm font-medium text-foreground/80';

  return (
    <div>
      <PageHeader
        title="Leave Policies"
        actions={
          canManage && !showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium"
            >
              Add Policy
            </button>
          ) : undefined
        }
      />

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 max-w-2xl space-y-4 rounded-lg border border-border bg-card p-6 shadow-soft"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Casual Leave" />
            </div>
            <div>
              <label className={labelCls}>Code *</label>
              <input required value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} placeholder="e.g. CL" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Annual Quota *</label>
              <input required type="number" min={0} step="0.5" value={annualQuota} onChange={(e) => setAnnualQuota(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Carry Forward Limit</label>
              <input type="number" min={0} step="0.5" value={carryForward} onChange={(e) => setCarryForward(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Max Consecutive Days</label>
              <input type="number" min={1} value={maxConsecutive} onChange={(e) => setMaxConsecutive(e.target.value)} className={inputCls} placeholder="No limit" />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={allowHalfDay} onChange={(e) => setAllowHalfDay(e.target.checked)} className="rounded border-gray-300" />
              Allow half-day
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} className="rounded border-gray-300" />
              Requires approval
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="rounded border-gray-300" />
              Paid leave
            </label>
          </div>

          {formError && <ErrorMessage message={formError} />}

          <div className="flex gap-3">
            <LoadingButton type="submit" loading={submitting} loadingText="Creating…">
              Create Policy
            </LoadingButton>
            <button type="button" onClick={resetForm} className="rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 motion-press transition-colors px-4 py-2 text-sm font-medium">
              Cancel
            </button>
          </div>
        </form>
      )}

      {!showCreate && formError && (
        <div className="mb-4"><ErrorMessage message={formError} /></div>
      )}

      {!showCreate && (
        <div className="mb-3">
          <TableSearch
            value={search}
            onChange={setSearch}
            placeholder="Search policies by name, code…"
            className="max-w-sm"
          />
        </div>
      )}

      {loading && <Loading />}
      {error && <ErrorMessage message={error} status={errorStatus} onRetry={refetch} fallback={{ label: 'View my requests', href: '/leave/requests' }} />}
      {data && total === 0 && (
        <EmptyState
          variant="leave"
          title="No leave policies"
          description={search ? 'No policies match your search.' : 'Create your first leave policy to start tracking time off.'}
          cta={
            canManage && !search
              ? { label: 'Add Policy', onClick: () => setShowCreate(true) }
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
                  <SortableHeader label="Name" sortKey="name" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Code" sortKey="code" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Annual Quota" sortKey="quota" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Carry Fwd</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Paid</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                  {canManage && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link href={`/leave/policies/${p.id}`} className="font-medium text-primary hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{p.code}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{p.annualQuotaDefault} days</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{p.carryForwardLimit}</td>
                    <td className="px-4 py-3 text-sm">
                      {p.isPaid ? (
                        <span className="text-success">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">Active</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">Inactive</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {p.isActive && (
                          <button
                            onClick={() => handleDeactivate(p.id, p.name)}
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
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      )}

      {/* Mobile cards */}
      {data && total > 0 && (
        <div className="block space-y-3 md:hidden">
          {items.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/leave/policies/${p.id}`} className="font-medium text-primary hover:underline">
                    {p.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.code}</p>
                </div>
                {p.isActive ? (
                  <span className="inline-flex items-center rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Active</span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">Inactive</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{p.annualQuotaDefault} days</span>
                <span>·</span>
                <span>Carry fwd {p.carryForwardLimit}</span>
                <span>·</span>
                <span>{p.isPaid ? 'Paid' : 'Unpaid'}</span>
              </div>
              {canManage && p.isActive && (
                <div className="mt-3">
                  <button
                    onClick={() => handleDeactivate(p.id, p.name)}
                    className="rounded bg-destructive-soft px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                  >
                    Deactivate
                  </button>
                </div>
              )}
            </div>
          ))}
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
