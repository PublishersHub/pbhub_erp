'use client';

import { useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingButton } from '@/components/ui/loading-button';
import { useAsync, usePermission } from '@/lib/hooks';
import {
  getAttendancePolicy,
  assignAttendancePolicy,
  removeAttendancePolicyAssignment,
} from '@/lib/attendance-api';
import { listEmployees } from '@/lib/employee-api';
import { formatDate, employeeName } from '@/lib/format';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AttendancePolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermission();
  const canManage = can('attendance.manage');
  const { data: policy, error, loading, refetch } = useAsync(() => getAttendancePolicy(id), [id]);
  const { data: employees } = useAsync(
    () => (canManage ? listEmployees() : Promise.resolve(null)),
    [],
  );

  // Assign form
  const [showAssign, setShowAssign] = useState(false);
  const [assignEmpId, setAssignEmpId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setSubmitting(true);
    try {
      await assignAttendancePolicy(id, {
        employeeId: assignEmpId,
        effectiveFrom,
        ...(effectiveTo && { effectiveTo }),
      });
      setShowAssign(false);
      setAssignEmpId('');
      setEffectiveFrom('');
      setEffectiveTo('');
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to assign');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(assignmentId: string) {
    try {
      await removeAttendancePolicyAssignment(id, assignmentId);
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
        backHref="/attendance/policies"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={policy.policyType} />
            {policy.isActive ? (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Active</span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">Inactive</span>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Policy Details */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Policy Details</h3>
            <dl>
              <DetailRow label="Type">{policy.policyType}</DetailRow>
              {policy.policyType === 'FIXED' ? (
                <>
                  <DetailRow label="Start Time">{policy.startTime ?? '—'}</DetailRow>
                  <DetailRow label="End Time">{policy.endTime ?? '—'}</DetailRow>
                </>
              ) : (
                <>
                  <DetailRow label="Min Hours/Day">{policy.minHoursPerDay ?? '—'}</DetailRow>
                  <DetailRow label="Core Start">{policy.coreStartTime ?? '—'}</DetailRow>
                  <DetailRow label="Core End">{policy.coreEndTime ?? '—'}</DetailRow>
                </>
              )}
              <DetailRow label="Grace Late">{policy.graceMinutesLate} minutes</DetailRow>
              <DetailRow label="Grace Early">{policy.graceMinutesEarly} minutes</DetailRow>
              <DetailRow label="Half-day Threshold">
                {policy.halfDayThresholdMinutes != null ? `${policy.halfDayThresholdMinutes} minutes` : 'Not set'}
              </DetailRow>
              <DetailRow label="Working Days">
                {policy.workingDays.map((d) => DAYS[d]).join(', ')}
              </DetailRow>
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                  <LoadingButton type="submit" loading={submitting} loadingText="Assigning..." className="!px-3 !py-1.5 !text-xs">
                    Assign
                  </LoadingButton>
                  <LoadingButton type="button" variant="secondary" onClick={() => { setShowAssign(false); setFormError(''); }} className="!px-3 !py-1.5 !text-xs">
                    Cancel
                  </LoadingButton>
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
                        {canManage && (
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleRemove(a.id)}
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
          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">Last Updated</h3>
            <p className="text-sm text-muted-foreground">{formatDate(policy.updatedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
