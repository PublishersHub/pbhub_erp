'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { useAsync, usePermission } from '@/lib/hooks';
import { getInstance, cancelInstance, reassignTask } from '@/lib/onboarding-api';
import { formatDate, employeeName } from '@/lib/format';
import { TaskStatusForm } from '@/components/onboarding/task-status-form';
import { DocumentUpload } from '@/components/onboarding/document-upload';

export default function OnboardingInstanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermission();
  const { data: inst, error, loading, refetch } = useAsync(() => getInstance(id), [id]);
  const [actionError, setActionError] = useState('');
  const [acting, setActing] = useState(false);

  // Cancel form
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Reassign form
  const [reassigningTaskId, setReassigningTaskId] = useState<string | null>(null);
  const [reassigneeId, setReassigneeId] = useState('');

  async function handleCancel() {
    setActionError('');
    setActing(true);
    try {
      await cancelInstance(id, { cancelReason: cancelReason.trim() || undefined });
      setShowCancelForm(false);
      setCancelReason('');
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setActing(false);
    }
  }

  async function handleReassign(taskId: string) {
    if (!reassigneeId.trim()) return;
    setActionError('');
    setActing(true);
    try {
      await reassignTask(taskId, { assigneeEmployeeId: reassigneeId.trim() });
      setReassigningTaskId(null);
      setReassigneeId('');
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Reassign failed');
    } finally {
      setActing(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!inst) return null;

  const tasks = (inst.tasks ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
  const isActive = inst.status !== 'CANCELLED' && inst.status !== 'COMPLETED';
  const canManage = can('onboarding.instance.manage');

  return (
    <div>
      <PageHeader
        title={`Onboarding — ${employeeName(inst.employee)}`}
        backHref="/onboarding"
        actions={<StatusBadge status={inst.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Details</h3>
            <dl>
              <DetailRow label="Employee">{employeeName(inst.employee)}</DetailRow>
              <DetailRow label="Employee Code">{inst.employee?.employeeCode}</DetailRow>
              <DetailRow label="Template">{inst.templateName}</DetailRow>
              <DetailRow label="Joining Date">{formatDate(inst.joiningDate)}</DetailRow>
              <DetailRow label="Progress">{completed}/{tasks.length} tasks completed</DetailRow>
              {inst.startedAt && <DetailRow label="Started">{formatDate(inst.startedAt)}</DetailRow>}
              {inst.completedAt && <DetailRow label="Completed">{formatDate(inst.completedAt)}</DetailRow>}
              {inst.cancelledAt && <DetailRow label="Cancelled">{formatDate(inst.cancelledAt)}</DetailRow>}
              {inst.cancelReason && <DetailRow label="Cancel Reason">{inst.cancelReason}</DetailRow>}
            </dl>
          </div>

          {/* Tasks */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">
              Tasks ({completed}/{tasks.length})
            </h3>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks in this onboarding.</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`rounded-md border p-4 ${
                      task.isOverdue && task.status !== 'COMPLETED'
                        ? 'border-l-2 border-l-destructive border-destructive/30 bg-destructive-soft'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{task.title}</p>
                          {task.isRequired && <span className="rounded bg-primary-soft px-1.5 py-0.5 text-xs font-medium text-primary">Required</span>}
                          {task.isOverdue && task.status !== 'COMPLETED' && (
                            <span className="rounded bg-destructive-soft px-1.5 py-0.5 text-xs font-medium text-destructive">Overdue</span>
                          )}
                        </div>
                        {task.description && <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>Due: {formatDate(task.dueDate)}</span>
                          <span>Role: {task.assigneeRole.replace(/_/g, ' ')}</span>
                          <span>Assignee: {task.assigneeEmployee ? employeeName(task.assigneeEmployee) : '—'}</span>
                        </div>
                        {task.blockedReason && <p className="mt-1 text-xs text-warning">Blocked: {task.blockedReason}</p>}
                        {task.notes && <p className="mt-1 text-xs text-muted-foreground">Notes: {task.notes}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <StatusBadge status={task.status} />
                        {isActive && can('onboarding.task.update') && (
                          <TaskStatusForm taskId={task.id} currentStatus={task.status} onUpdated={refetch} />
                        )}
                        {isActive && canManage && task.status !== 'COMPLETED' && (
                          <>
                            {reassigningTaskId !== task.id ? (
                              <button
                                onClick={() => { setReassigningTaskId(task.id); setReassigneeId(''); }}
                                className="text-xs text-muted-foreground hover:text-foreground/80"
                              >
                                Reassign
                              </button>
                            ) : (
                              <div className="flex items-center gap-1">
                                <input
                                  placeholder="Employee ID"
                                  value={reassigneeId}
                                  onChange={(e) => setReassigneeId(e.target.value)}
                                  className="w-32 rounded border border-input bg-card px-1.5 py-0.5 text-xs text-foreground focus:border-primary focus:outline-none"
                                />
                                <button
                                  disabled={acting || !reassigneeId.trim()}
                                  onClick={() => handleReassign(task.id)}
                                  className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                  OK
                                </button>
                                <button
                                  onClick={() => setReassigningTaskId(null)}
                                  className="text-xs text-muted-foreground/70 hover:text-muted-foreground"
                                >
                                  X
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {task.allowDocument && (
                      <div className="mt-2 border-t border-border pt-2">
                        <DocumentUpload
                          taskId={task.id}
                          documents={task.documents ?? []}
                          canUpload={can('onboarding.task.update') && task.status !== 'COMPLETED' && isActive}
                          canDelete={canManage}
                          onChanged={refetch}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {isActive && canManage && (
            <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
              <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Actions</h3>
              <div className="space-y-2">
                {!showCancelForm ? (
                  <button
                    onClick={() => setShowCancelForm(true)}
                    className="w-full rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
                  >
                    Cancel Onboarding
                  </button>
                ) : (
                  <div className="rounded-md border border-destructive-soft bg-destructive-soft p-3 space-y-2">
                    <textarea
                      placeholder="Cancel reason (optional)"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={2}
                      className="block w-full rounded-md border border-input bg-card px-2 py-1 text-xs text-foreground focus:border-destructive focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={acting}
                        onClick={handleCancel}
                        className="rounded-md bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                      >
                        {acting ? 'Cancelling...' : 'Confirm Cancel'}
                      </button>
                      <button
                        onClick={() => { setShowCancelForm(false); setCancelReason(''); }}
                        className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {actionError && <div className="mt-3"><ErrorMessage message={actionError} /></div>}
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">Created</h3>
            <p className="text-sm text-muted-foreground">{formatDate(inst.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
