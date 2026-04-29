'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
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
import { listLeavePolicies, createLeavePolicy, deactivateLeavePolicy } from '@/lib/leave-api';

export default function LeavePoliciesPage() {
  const { can } = usePermission();
  const canManage = can('leave.manage');
  const { page, sort, order, pageSize, setPage, setSort } = useTableParams();
  const { data, error, loading, refetch } = useAsync(() => listLeavePolicies(), []);

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

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
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

  async function handleDeactivate(id: string) {
    try {
      await deactivateLeavePolicy(id);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to deactivate');
    }
  }

  const inputCls =
    'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-sm font-medium text-gray-700';

  return (
    <div>
      <PageHeader
        title="Leave Policies"
        actions={
          canManage && !showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Policy
            </button>
          ) : undefined
        }
      />

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 max-w-2xl space-y-4 rounded-lg border bg-white p-6 shadow-sm"
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
            <button type="submit" disabled={submitting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create Policy'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
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
        <EmptyState title="No leave policies" description="Create your first leave policy." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Name" sortKey="name" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Code" sortKey="code" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Annual Quota" sortKey="quota" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Carry Fwd</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Paid</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  {canManage && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link href={`/leave/policies/${p.id}`} className="font-medium text-blue-600 hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{p.code}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{p.annualQuotaDefault} days</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{p.carryForwardLimit}</td>
                    <td className="px-4 py-3 text-sm">
                      {p.isPaid ? (
                        <span className="text-green-700">Yes</span>
                      ) : (
                        <span className="text-gray-500">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Active</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">Inactive</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {p.isActive && (
                          <button
                            onClick={() => handleDeactivate(p.id)}
                            className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
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
    </div>
  );
}
