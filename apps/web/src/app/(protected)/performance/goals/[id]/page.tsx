'use client';

import { useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingButton } from '@/components/ui/loading-button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useAsync, usePermission } from '@/lib/hooks';
import {
  getGoal,
  submitGoal,
  approveGoal,
  deactivateGoal,
  addGoalProgress,
  getGoalProgress,
} from '@/lib/performance-api';
import { formatDateTime, employeeName } from '@/lib/format';

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const confirm = useConfirm();
  const { can } = usePermission();
  const canCreateGoals = can('performance.create_goals');
  const canApproveGoals = can('performance.approve_goals');

  const { data: goal, error, loading, refetch } = useAsync(() => getGoal(id), [id]);
  const { data: progress, refetch: refetchProgress } = useAsync(() => getGoalProgress(id), [id]);

  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Approve / Reject
  const [showApproval, setShowApproval] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Progress form
  const [showProgress, setShowProgress] = useState(false);
  const [progressValue, setProgressValue] = useState('');
  const [progressNote, setProgressNote] = useState('');

  async function handleSubmit() {
    setActionError('');
    setActionLoading(true);
    try {
      await submitGoal(id);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApproval(action: 'APPROVED' | 'REJECTED') {
    setActionError('');
    setActionLoading(true);
    try {
      await approveGoal(id, {
        action,
        ...(action === 'REJECTED' && rejectionReason.trim() && { rejectionReason: rejectionReason.trim() }),
      });
      setShowApproval(false);
      setRejectionReason('');
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeactivate() {
    const ok = await confirm({
      title: 'Deactivate this goal?',
      description: 'The goal will be marked inactive and will no longer count toward this cycle. Existing progress is preserved.',
      confirmLabel: 'Deactivate',
      tone: 'danger',
    });
    if (!ok) return;
    setActionError('');
    setActionLoading(true);
    try {
      await deactivateGoal(id);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Deactivation failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddProgress(e: FormEvent) {
    e.preventDefault();
    setActionError('');
    setActionLoading(true);
    try {
      await addGoalProgress(id, {
        ...(progressValue && { value: parseFloat(progressValue) }),
        ...(progressNote.trim() && { note: progressNote.trim() }),
      });
      setShowProgress(false);
      setProgressValue('');
      setProgressNote('');
      refetch();
      refetchProgress();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add progress');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!goal) return null;

  const isDraft = goal.status === 'DRAFT';
  const isPending = goal.status === 'PENDING_APPROVAL';
  const isApproved = goal.status === 'APPROVED';
  const canSubmitGoal = canCreateGoals && isDraft;
  const canApproveThisGoal = canApproveGoals && isPending;
  const canTrackProgress = isApproved && goal.isActive;
  const canDeactivateGoal = canCreateGoals && goal.isActive && !isDraft;

  return (
    <div>
      <PageHeader
        title={goal.title}
        backHref="/performance/goals"
        actions={<StatusBadge status={goal.status} />}
      />

      {actionError && (
        <div className="mb-4"><ErrorMessage message={actionError} /></div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Goal details */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Goal Details</h3>
            <dl>
              <DetailRow label="Description">{goal.description}</DetailRow>
              <DetailRow label="Employee">{employeeName(goal.employee)}</DetailRow>
              <DetailRow label="Cycle">{goal.cycle?.name ?? '—'}</DetailRow>
              <DetailRow label="Measurement Type"><StatusBadge status={goal.measurementType} /></DetailRow>
              <DetailRow label="Weight">{goal.weight}%</DetailRow>
              <DetailRow label="Current Value">{goal.currentValue}</DetailRow>
              {goal.targetValue && <DetailRow label="Target Value">{goal.targetValue}</DetailRow>}
              <DetailRow label="Active">{goal.isActive ? 'Yes' : 'No'}</DetailRow>
              {goal.approvedByEmployee && (
                <DetailRow label="Approved By">{employeeName(goal.approvedByEmployee)}</DetailRow>
              )}
              {goal.approvedAt && (
                <DetailRow label="Approved At">{formatDateTime(goal.approvedAt)}</DetailRow>
              )}
              {goal.rejectionReason && (
                <DetailRow label="Rejection Reason">
                  <span className="text-destructive">{goal.rejectionReason}</span>
                </DetailRow>
              )}
            </dl>
          </div>

          {/* Progress History */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                Progress Updates ({(progress ?? []).length})
              </h3>
              {canTrackProgress && !showProgress && (
                <button
                  onClick={() => setShowProgress(true)}
                  className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 motion-press"
                >
                  Add Progress
                </button>
              )}
            </div>

            {showProgress && (
              <form onSubmit={handleAddProgress} className="mb-4 space-y-3 rounded-md border border-primary/20 bg-primary-soft/30 p-3">
                {goal.measurementType !== 'QUALITATIVE' && (
                  <div>
                    <label className="block text-xs font-medium text-foreground">Value</label>
                    <input
                      type="number"
                      step="0.01"
                      value={progressValue}
                      onChange={(e) => setProgressValue(e.target.value)}
                      className="w-full rounded border border-input bg-card px-2 py-1.5 text-sm"
                      placeholder="New current value"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-foreground">Note</label>
                  <textarea
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                    rows={2}
                    className="w-full rounded border border-input bg-card px-2 py-1.5 text-sm"
                    placeholder="Describe progress..."
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={actionLoading} className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-50 motion-press">
                    {actionLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setShowProgress(false)} className="rounded-md bg-secondary text-secondary-foreground px-3 py-1.5 text-xs hover:bg-secondary/80 motion-press">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {(progress ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No progress updates yet.</p>
            ) : (
              <div className="space-y-3">
                {(progress ?? []).map((p) => (
                  <div key={p.id} className="flex items-start gap-3 rounded-md border border-border/50 bg-muted/30 p-3">
                    <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {employeeName(p.updatedByEmployee)}
                        </span>
                        {p.value && (
                          <span className="rounded bg-primary-soft px-1.5 py-0.5 text-xs font-medium text-primary">
                            Value: {p.value}
                          </span>
                        )}
                      </div>
                      {p.note && <p className="mt-1 text-sm text-foreground/80">{p.note}</p>}
                      <p className="mt-1 text-xs text-muted-foreground/70">{formatDateTime(p.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar actions */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-soft space-y-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">Actions</h3>

            {canSubmitGoal && (
              <LoadingButton onClick={handleSubmit} loading={actionLoading} loadingText="Submitting..." className="w-full">
                Submit for Approval
              </LoadingButton>
            )}

            {canApproveThisGoal && !showApproval && (
              <button
                onClick={() => setShowApproval(true)}
                className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 motion-press"
              >
                Review Goal
              </button>
            )}

            {showApproval && (
              <div className="space-y-2 rounded-md border border-primary/20 bg-primary-soft/30 p-3">
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Rejection reason (required if rejecting)"
                  rows={2}
                  className="w-full rounded border border-input bg-card px-2 py-1.5 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproval('APPROVED')}
                    disabled={actionLoading}
                    className="flex-1 rounded-md bg-success text-success-foreground px-3 py-1.5 text-xs font-medium hover:bg-success/90 disabled:opacity-50 motion-press"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleApproval('REJECTED')}
                    disabled={actionLoading}
                    className="flex-1 rounded-md bg-destructive text-destructive-foreground px-3 py-1.5 text-xs font-medium hover:bg-destructive/90 disabled:opacity-50 motion-press"
                  >
                    Reject
                  </button>
                </div>
                <button onClick={() => setShowApproval(false)} className="w-full rounded-md bg-secondary text-secondary-foreground px-3 py-1.5 text-xs hover:bg-secondary/80 motion-press">
                  Cancel
                </button>
              </div>
            )}

            {canDeactivateGoal && (
              <button
                onClick={handleDeactivate}
                disabled={actionLoading}
                className="w-full rounded-md bg-destructive-soft text-destructive px-4 py-2 text-sm font-medium hover:bg-destructive/20 disabled:opacity-50 motion-press disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Working…' : 'Deactivate Goal'}
              </button>
            )}

            {!canSubmitGoal && !canApproveThisGoal && !canTrackProgress && !canDeactivateGoal && (
              <p className="text-xs text-muted-foreground">No actions available.</p>
            )}
          </div>

          {/* Progress summary */}
          {goal.measurementType !== 'QUALITATIVE' && (
            <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
              <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Progress</h3>
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{goal.currentValue}</p>
                {goal.targetValue && (
                  <p className="text-sm text-muted-foreground">of {goal.targetValue} target</p>
                )}
                {goal.targetValue && parseFloat(goal.targetValue) > 0 && (
                  <div className="mt-3">
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full bg-primary transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (parseFloat(goal.currentValue) / parseFloat(goal.targetValue)) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Math.round((parseFloat(goal.currentValue) / parseFloat(goal.targetValue)) * 100)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">Created By</h3>
            <p className="text-sm text-foreground/80">{employeeName(goal.createdByEmployee)}</p>
            <p className="text-xs text-muted-foreground/70">{formatDateTime(goal.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
