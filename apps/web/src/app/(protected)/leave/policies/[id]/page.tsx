'use client';

import { useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { useAsync, usePermission } from '@/lib/hooks';
import { getLeavePolicy, assignLeavePolicy, removeAssignment } from '@/lib/leave-api';
import { listEmployees } from '@/lib/employee-api';
import { formatDate, employeeName } from '@/lib/format';

export default function LeavePolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermission();
  const canManage = can('leave.manage');
  const { data: policy, error, loading, refetch } = useAsync(() => getLeavePolicy(id), [id]);
  const { data: employees } = useAsync(
    () => (canManage ? listEmployees() : Promise.resolve(null)),
    [],
  );

  // Assign form
  const [showAssign, setShowAssign] = useState(false);
  const [assignEmpId, setAssignEmpId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [customQuota, setCustomQuota] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setSubmitting(true);
    try {
      await assignLeavePolicy(id, {
        employeeId: assignEmpId,
        effectiveFrom,
        ...(effectiveTo && { effectiveTo }),
        ...(customQuota && { customAnnualQuota: parseFloat(customQuota) }),
      });
      setShowAssign(false);
      setAssignEmpId('');
      setEffectiveFrom('');
      setEffectiveTo('');
      setCustomQuota('');
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to assign');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    try {
      await removeAssignment(id, assignmentId);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to remove assignment');
    }
  }

  const inputCls =
    'mt-1 block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';
  const labelCls = 'block text-sm font-medium text-foreground/80';

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!policy) return null;

  return (
    <div>
      <PageHeader
        title={policy.name}
        backHref="/leave/policies"
        actions={
          <div className="flex items-center gap-2">
            {policy.isActive ? (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                Inactive
              </span>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Policy Details</h3>
            <dl>
              <DetailRow label="Code">{policy.code}</DetailRow>
              <DetailRow label="Description">{policy.description}</DetailRow>
              <DetailRow label="Annual Quota">{policy.annualQuotaDefault} days</DetailRow>
              <DetailRow label="Carry Forward Limit">{policy.carryForwardLimit} days</DetailRow>
              <DetailRow label="Max Consecutive Days">
                {policy.maxConsecutiveDays ?? 'No limit'}
              </DetailRow>
              <DetailRow label="Half-day Allowed">
                {policy.allowHalfDay ? 'Yes' : 'No'}
              </DetailRow>
              <DetailRow label="Requires Approval">
                {policy.requiresApproval ? 'Yes' : 'No'}
              </DetailRow>
              <DetailRow label="Paid Leave">{policy.isPaid ? 'Yes' : 'No'}</DetailRow>
            </dl>
          </div>

          {/* Assignments */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                Assignments ({policy.assignments?.length ?? 0})
              </h3>
              {canManage && !showAssign && (
                <button
                  onClick={() => setShowAssign(true)}
                  className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-3 py-1.5 text-xs font-medium"
                >
                  Assign Employee
                </button>
              )}
            </div>

            {showAssign && (
              <form onSubmit={handleAssign} className="mb-4 space-y-3 rounded-md border border-primary/20 bg-primary-soft/20 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Employee *</label>
                    <select required value={assignEmpId} onChange={(e) => setAssignEmpId(e.target.value)} className={inputCls}>
                      <option value="">Select...</option>
                      {(employees ?? []).map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeCode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Custom Quota</label>
                    <input type="number" min={0} step="0.5" value={customQuota} onChange={(e) => setCustomQuota(e.target.value)} className={inputCls} placeholder="Use policy default" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Effective From *</label>
                    <input type="date" required value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Effective To</label>
                    <input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} className={inputCls} />
                  </div>
                </div>
                {formError && <ErrorMessage message={formError} />}
                <div className="flex gap-2">
                  <button type="submit" disabled={submitting} className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-3 py-1.5 text-xs font-medium disabled:opacity-50">
                    {submitting ? 'Assigning...' : 'Assign'}
                  </button>
                  <button type="button" onClick={() => { setShowAssign(false); setFormError(''); }} className="rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 motion-press transition-colors px-3 py-1.5 text-xs font-medium">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {!showAssign && formError && (
              <div className="mb-3"><ErrorMessage message={formError} /></div>
            )}

            {(!policy.assignments || policy.assignments.length === 0) && (
              <EmptyState title="No assignments" description="Assign employees to this policy." />
            )}

            {policy.assignments && policy.assignments.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Employee</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">From</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">To</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Custom Quota</th>
                      {canManage && (
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {policy.assignments.map((a) => (
                      <tr key={a.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-2 text-foreground">{employeeName(a.employee)}</td>
                        <td className="px-4 py-2 text-muted-foreground">{formatDate(a.effectiveFrom)}</td>
                        <td className="px-4 py-2 text-muted-foreground">{formatDate(a.effectiveTo)}</td>
                        <td className="px-4 py-2 text-muted-foreground">{a.customAnnualQuota ?? '—'}</td>
                        {canManage && (
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleRemoveAssignment(a.id)}
                              className="rounded bg-destructive-soft text-destructive hover:bg-destructive/20 transition-colors px-2 py-1 text-xs font-medium"
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">Created</h3>
            <p className="text-sm text-muted-foreground">{formatDate(policy.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
