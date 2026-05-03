'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { useAsync, usePermission } from '@/lib/hooks';
import {
  getRequisition,
  submitRequisition,
  reviewRequisition,
  closeRequisition,
} from '@/lib/recruitment-api';
import { formatDate, formatCurrency, employeeName } from '@/lib/format';

export default function RequisitionDetailPage() {
  useEffect(() => {
    document.title = 'Requisition · PbHub';
  }, []);
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = usePermission();
  const { data: req, error, loading, refetch } = useAsync(() => getRequisition(id), [id]);
  const [actionError, setActionError] = useState('');
  const [acting, setActing] = useState(false);

  // Inline form states
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeReason, setCloseReason] = useState('');

  async function doAction(fn: () => Promise<unknown>) {
    setActionError('');
    setActing(true);
    try {
      await fn();
      setShowRejectForm(false);
      setShowCloseForm(false);
      setRejectReason('');
      setCloseReason('');
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!req) return null;

  const canSubmit = req.status === 'DRAFT' && can('recruitment.requisition.create');
  const canReview = req.status === 'PENDING_APPROVAL' && can('recruitment.requisition.approve');
  const canClose = !['CLOSED', 'CANCELLED', 'FILLED'].includes(req.status) && can('recruitment.requisition.approve');

  return (
    <div>
      <PageHeader
        title={req.title}
        backHref="/recruitment/requisitions"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={req.status} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6 shadow-soft">
          <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Details</h3>
          <dl>
            <DetailRow label="Requisition #">{req.requisitionNumber}</DetailRow>
            <DetailRow label="Employment Type">{req.employmentType.replace(/_/g, ' ')}</DetailRow>
            <DetailRow label="Hiring Manager">{employeeName(req.hiringManager)}</DetailRow>
            <DetailRow label="Department">{req.department?.name}</DetailRow>
            <DetailRow label="Designation">{req.designation?.title}</DetailRow>
            <DetailRow label="Location">{req.location}</DetailRow>
            <DetailRow label="Openings">{req.positionsFilled}/{req.numberOfOpenings}</DetailRow>
            <DetailRow label="Salary Range">
              {req.minSalary || req.maxSalary
                ? `${formatCurrency(req.minSalary)} – ${formatCurrency(req.maxSalary)}`
                : null}
            </DetailRow>
            <DetailRow label="Target Start">{formatDate(req.targetStartDate)}</DetailRow>
            <DetailRow label="Submitted">{formatDate(req.submittedAt)}</DetailRow>
            <DetailRow label="Approved">{formatDate(req.approvedAt)}</DetailRow>
            {req.rejectionReason && <DetailRow label="Rejection Reason">{req.rejectionReason}</DetailRow>}
          </dl>

          {req.description && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-foreground">Description</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{req.description}</p>
            </div>
          )}

          {req.requirements && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-foreground">Requirements</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{req.requirements}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Actions</h3>
            <div className="space-y-2">
              {canSubmit && (
                <button
                  disabled={acting}
                  onClick={() => doAction(() => submitRequisition(id))}
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 motion-press disabled:opacity-50"
                >
                  {acting ? 'Submitting...' : 'Submit for Approval'}
                </button>
              )}
              {canReview && (
                <>
                  <button
                    disabled={acting}
                    onClick={() => doAction(() => reviewRequisition(id, { decision: 'APPROVED' }))}
                    className="w-full rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 motion-press disabled:opacity-50"
                  >
                    {acting ? 'Approving...' : 'Approve'}
                  </button>
                  {!showRejectForm ? (
                    <button
                      disabled={acting}
                      onClick={() => setShowRejectForm(true)}
                      className="w-full rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 motion-press disabled:opacity-50"
                    >
                      Reject
                    </button>
                  ) : (
                    <div className="rounded-md border border-destructive/20 bg-destructive-soft p-3 space-y-2">
                      <textarea
                        placeholder="Rejection reason (optional)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1 text-xs focus:border-primary focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={acting}
                          onClick={() =>
                            doAction(() =>
                              reviewRequisition(id, {
                                decision: 'REJECTED',
                                reason: rejectReason.trim() || undefined,
                              }),
                            )
                          }
                          className="rounded-md bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 motion-press disabled:opacity-50"
                        >
                          {acting ? 'Rejecting...' : 'Confirm Reject'}
                        </button>
                        <button
                          onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                          className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 motion-press"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
              {canClose && (
                <>
                  {!showCloseForm ? (
                    <button
                      disabled={acting}
                      onClick={() => setShowCloseForm(true)}
                      className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 motion-press disabled:opacity-50"
                    >
                      Close Requisition
                    </button>
                  ) : (
                    <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                      <textarea
                        placeholder="Close reason (optional)"
                        value={closeReason}
                        onChange={(e) => setCloseReason(e.target.value)}
                        rows={2}
                        className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1 text-xs focus:border-primary focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={acting}
                          onClick={() =>
                            doAction(() =>
                              closeRequisition(id, { reason: closeReason.trim() || undefined }),
                            )
                          }
                          className="rounded-md bg-foreground/90 px-3 py-1 text-xs font-medium text-background hover:bg-foreground motion-press disabled:opacity-50"
                        >
                          {acting ? 'Closing...' : 'Confirm Close'}
                        </button>
                        <button
                          onClick={() => { setShowCloseForm(false); setCloseReason(''); }}
                          className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 motion-press"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
              <button
                onClick={() => router.push(`/recruitment/applications?requisitionId=${id}`)}
                className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 motion-press"
              >
                View Applications
              </button>
            </div>
            {actionError && <div className="mt-3"><ErrorMessage message={actionError} /></div>}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">Created</h3>
            <p className="text-sm text-muted-foreground">{formatDate(req.createdAt)}</p>
            {req.createdBy && (
              <p className="text-sm text-muted-foreground/70">by {employeeName(req.createdBy)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
