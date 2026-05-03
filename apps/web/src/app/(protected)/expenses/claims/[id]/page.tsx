'use client';

import { useState, useEffect } from 'react';
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
  getMyClaimDetail,
  getClaimDetail,
  submitExpenseClaim,
  cancelExpenseClaim,
  reviewExpenseClaim,
  reimburseExpenseClaim,
} from '@/lib/expense-api';
import { resolveStorageUrl } from '@/lib/upload-api';
import { formatCurrency, formatDate, formatDateTime, employeeName } from '@/lib/format';
import { useToast } from '@/components/toast';
import type { ExpenseClaim, ExpenseApprovalDecision } from '@/types/expense';

function isImageReceipt(filename: string | null | undefined, key: string): boolean {
  const target = (filename || key).toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)(\?|$)/i.test(target);
}

function isPdfReceipt(filename: string | null | undefined, key: string): boolean {
  const target = (filename || key).toLowerCase();
  return /\.pdf(\?|$)/i.test(target);
}

function ReceiptLink({ keyOrUrl, filename }: { keyOrUrl: string; filename?: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setError(null);
    resolveStorageUrl(keyOrUrl)
      .then((u) => { if (!cancelled) setUrl(u); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); });
    return () => { cancelled = true; };
  }, [keyOrUrl]);

  const display = filename || 'View receipt';
  const isImage = isImageReceipt(filename, keyOrUrl);
  const isPdf = isPdfReceipt(filename, keyOrUrl);

  if (error) {
    return <span className="text-xs text-destructive" title={error}>Unavailable</span>;
  }
  if (!url) {
    return <span className="text-xs text-muted-foreground/70">Loading…</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-primary hover:underline text-xs font-medium"
      title={display}
    >
      {isImage ? (
        <img
          src={url}
          alt={display}
          className="h-[60px] w-[60px] shrink-0 rounded border border-border object-cover"
        />
      ) : isPdf ? (
        <span className="text-base leading-none" aria-hidden>📄</span>
      ) : (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V20a2 2 0 01-2 2z" />
        </svg>
      )}
      <span className="truncate max-w-[160px]">{display}</span>
    </a>
  );
}

export default function ExpenseClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermission();
  const toast = useToast();
  const confirm = useConfirm();
  const canReadAll = can('expense.read');
  const canApprove = can('expense.approve');
  const canReimburse = can('expense.reimburse');
  const canCreate = can('expense.create');

  useEffect(() => {
    document.title = 'Expense Claims · PbHub';
  }, []);

  const { data: remoteClaim, error, loading, refetch } = useAsync(
    () => (canReadAll ? getClaimDetail(id) : getMyClaimDetail(id)),
    [id, canReadAll],
  );

  // Local copy for optimistic mutations
  const [claim, setClaim] = useState<ExpenseClaim | null>(null);

  // Keep local copy in sync when remote data arrives (initial load + refetch)
  useEffect(() => {
    if (remoteClaim) setClaim(remoteClaim);
  }, [remoteClaim]);

  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Review form
  const [showReview, setShowReview] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState('');

  // Cancel form
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Reimburse form
  const [showReimburse, setShowReimburse] = useState(false);
  const [payrollId, setPayrollId] = useState('');

  async function handleSubmit() {
    setActionError('');
    setActionLoading(true);
    try {
      await submitExpenseClaim(id);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    const ok = await confirm({
      title: 'Cancel this claim?',
      description: 'Cancelled claims cannot be resubmitted.',
      confirmLabel: 'Cancel claim',
      cancelLabel: 'Keep',
      tone: 'danger',
    });
    if (!ok) return;
    setActionError('');
    setActionLoading(true);
    try {
      await cancelExpenseClaim(id, cancelReason.trim() ? { cancelReason: cancelReason.trim() } : undefined);
      setShowCancel(false);
      setCancelReason('');
      toast.success('Claim cancelled');
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Cancel failed';
      setActionError(msg);
      toast.error('Cancel failed', msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReview(action: ExpenseApprovalDecision) {
    if (!claim) return;

    if (action === 'REJECTED') {
      const ok = await confirm({
        title: 'Reject this claim?',
        description: 'The submitter will be notified with your remarks.',
        confirmLabel: 'Reject',
        tone: 'danger',
      });
      if (!ok) return;
    }

    const prev = claim;
    const trimmedRemarks = reviewRemarks.trim() || null;

    // Determine the optimistic next status based on current status + action
    let optimisticStatus: ExpenseClaim['status'];
    let optimisticRole: 'MANAGER' | 'FINANCE';
    if (action === 'APPROVED') {
      if (claim.status === 'SUBMITTED') {
        optimisticStatus = 'MANAGER_APPROVED';
        optimisticRole = 'MANAGER';
      } else {
        // MANAGER_APPROVED → FINANCE_APPROVED
        optimisticStatus = 'FINANCE_APPROVED';
        optimisticRole = 'FINANCE';
      }
    } else {
      optimisticStatus = 'REJECTED';
      optimisticRole = claim.status === 'SUBMITTED' ? 'MANAGER' : 'FINANCE';
    }

    // Optimistic update
    setClaim({
      ...claim,
      status: optimisticStatus,
      finalDecisionAt: action === 'REJECTED' ? new Date().toISOString() : claim.finalDecisionAt,
      approvalActions: [
        ...(claim.approvalActions ?? []),
        {
          id: 'optimistic-' + Date.now(),
          expenseClaimId: claim.id,
          approverEmployeeId: '?',
          approverRole: optimisticRole,
          action,
          remarks: trimmedRemarks,
          createdAt: new Date().toISOString(),
          approverEmployee: { id: '?', firstName: 'You', lastName: '' },
        },
      ],
    });

    const actionLabel = action === 'APPROVED' ? 'approved' : 'rejected';
    toast.success(
      `Claim ${actionLabel}`,
      `Decision recorded for ${employeeName(claim.employee)}`,
    );
    setShowReview(false);
    setReviewRemarks('');
    setActionLoading(true);
    setActionError('');

    try {
      await reviewExpenseClaim(id, {
        action,
        ...(trimmedRemarks && { remarks: trimmedRemarks }),
      });
      await refetch();
    } catch (err) {
      setClaim(prev);
      setShowReview(true);
      toast.error(
        `Failed to ${action === 'APPROVED' ? 'approve' : 'reject'}`,
        err instanceof Error ? err.message : 'Unknown error',
      );
      setActionError(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReimburse() {
    if (!payrollId.trim()) {
      setActionError('Payroll ID is required');
      return;
    }
    const ok = await confirm({
      title: 'Mark claim as reimbursed?',
      description: 'A payroll adjustment will be created against the selected payroll.',
      confirmLabel: 'Reimburse',
    });
    if (!ok) return;
    setActionError('');
    setActionLoading(true);
    try {
      await reimburseExpenseClaim(id, { payrollId: payrollId.trim() });
      setShowReimburse(false);
      setPayrollId('');
      toast.success('Claim reimbursed');
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Reimbursement failed';
      setActionError(msg);
      toast.error('Reimbursement failed', msg);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!claim) return null;

  const isDraft = claim.status === 'DRAFT';
  const canCancelClaim = canCreate && !['REJECTED', 'REIMBURSED', 'CANCELLED'].includes(claim.status);
  const canSubmitClaim = canCreate && isDraft;
  const canReviewClaim = canApprove && ['SUBMITTED', 'MANAGER_APPROVED'].includes(claim.status);
  const canReimburseClaim = canReimburse && claim.status === 'FINANCE_APPROVED';

  const earnings = (claim.items ?? []);
  const approvalHistory = claim.approvalActions ?? [];

  return (
    <div>
      <PageHeader
        title={claim.claimNumber}
        backHref="/expenses/claims"
        actions={<StatusBadge status={claim.status} />}
      />

      {actionError && (
        <div className="mb-4"><ErrorMessage message={actionError} /></div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Claim details */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Claim Details</h3>
            <dl>
              <DetailRow label="Title">{claim.title}</DetailRow>
              <DetailRow label="Description">{claim.description}</DetailRow>
              <DetailRow label="Employee">{employeeName(claim.employee)}</DetailRow>
              <DetailRow label="Policy">{claim.expensePolicy?.name ?? '—'}</DetailRow>
              <DetailRow label="Total Amount">
                <span className="text-lg font-bold">{formatCurrency(claim.totalAmount)}</span>
              </DetailRow>
              <DetailRow label="Submitted">{formatDateTime(claim.submittedAt)}</DetailRow>
              {claim.cancelledAt && (
                <DetailRow label="Cancelled">{formatDateTime(claim.cancelledAt)}</DetailRow>
              )}
              {claim.cancelReason && (
                <DetailRow label="Cancel Reason">{claim.cancelReason}</DetailRow>
              )}
              {claim.reimbursedAt && (
                <DetailRow label="Reimbursed">{formatDateTime(claim.reimbursedAt)}</DetailRow>
              )}
              {claim.reimbursedBy && (
                <DetailRow label="Reimbursed By">{employeeName(claim.reimbursedBy)}</DetailRow>
              )}
            </dl>
          </div>

          {/* Line Items */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">
              Items ({earnings.length})
            </h3>
            {earnings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Date</th>
                      <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {earnings.map((item) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap px-4 py-2 text-foreground">
                          <span className="font-medium">{item.expenseCategory?.code}</span>
                          <span className="ml-1 text-muted-foreground/70">— {item.expenseCategory?.name}</span>
                        </td>
                        <td className="px-4 py-2 text-foreground">{item.description}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{formatDate(item.expenseDate)}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-foreground">{formatCurrency(item.amount)}</td>
                        <td className="px-4 py-2">
                          {item.receiptUrl ? (
                            <ReceiptLink keyOrUrl={item.receiptUrl} filename={item.receiptFileName} />
                          ) : (
                            <span className="text-xs text-muted-foreground/70">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-primary-soft border-t border-primary/20">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 font-bold text-foreground">Total</td>
                      <td className="px-4 py-2 text-right font-bold text-primary">{formatCurrency(claim.totalAmount)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Approval History */}
          {approvalHistory.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
              <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Approval History</h3>
              <div className="space-y-3">
                {approvalHistory.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-md border border-border p-3 bg-background">
                    <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${a.action === 'APPROVED' ? 'bg-success' : 'bg-destructive'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{employeeName(a.approverEmployee)}</span>
                        <StatusBadge status={a.action} />
                        <span className="text-xs text-muted-foreground/70">as {a.approverRole}</span>
                      </div>
                      {a.remarks && <p className="mt-1 text-sm text-muted-foreground">{a.remarks}</p>}
                      <p className="mt-1 text-xs text-muted-foreground/70">{formatDateTime(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payroll Adjustment */}
          {claim.payrollAdjustment && (
            <div className="rounded-lg border border-success/20 bg-success-soft p-4">
              <h4 className="text-sm font-semibold text-success">Payroll Adjustment Created</h4>
              <p className="mt-1 text-sm text-success/90">{claim.payrollAdjustment.description}</p>
              <p className="mt-1 text-sm font-bold text-success">Amount: {formatCurrency(claim.payrollAdjustment.amount)}</p>
            </div>
          )}
        </div>

        {/* Sidebar actions */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-soft space-y-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">Actions</h3>

            {canSubmitClaim && (
              <LoadingButton
                onClick={handleSubmit}
                loading={actionLoading}
                loadingText="Submitting…"
                className="w-full"
              >
                Submit Claim
              </LoadingButton>
            )}

            {canReviewClaim && !showReview && (
              <button
                onClick={() => setShowReview(true)}
                disabled={actionLoading}
                className="w-full rounded-md bg-info text-info-foreground hover:bg-info/90 motion-press transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Review
              </button>
            )}

            {showReview && (
              <div className="space-y-2 rounded-md border border-info/20 bg-info-soft p-3">
                <textarea
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder="Remarks (optional)"
                  rows={2}
                  className="w-full rounded border border-input px-2 py-1.5 text-sm bg-card text-foreground"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview('APPROVED')}
                    disabled={actionLoading}
                    className="flex-1 rounded-md bg-success text-success-foreground px-3 py-1.5 text-xs font-medium hover:bg-success/90 disabled:opacity-50"
                  >
                    {actionLoading ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReview('REJECTED')}
                    disabled={actionLoading}
                    className="flex-1 rounded-md bg-destructive text-destructive-foreground px-3 py-1.5 text-xs font-medium hover:bg-destructive/90 disabled:opacity-50"
                  >
                    {actionLoading ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
                <button onClick={() => setShowReview(false)} disabled={actionLoading} className="w-full rounded-md bg-secondary text-secondary-foreground px-3 py-1.5 text-xs hover:bg-secondary/80 disabled:opacity-50">
                  Cancel
                </button>
              </div>
            )}

            {canReimburseClaim && !showReimburse && (
              <button
                onClick={() => setShowReimburse(true)}
                disabled={actionLoading}
                className="w-full rounded-md bg-success text-success-foreground hover:bg-success/90 motion-press transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Reimburse
              </button>
            )}

            {showReimburse && (
              <div className="space-y-2 rounded-md border border-success/20 bg-success-soft p-3">
                <label className="block text-xs font-medium text-foreground/80">Payroll Record ID *</label>
                <input
                  value={payrollId}
                  onChange={(e) => setPayrollId(e.target.value)}
                  placeholder="Paste payroll ID"
                  className="w-full rounded border border-input px-2 py-1.5 text-sm bg-card text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  The payroll must be in PROCESSED status for this employee.
                </p>
                <button
                  onClick={handleReimburse}
                  disabled={actionLoading}
                  className="w-full rounded-md bg-success text-success-foreground px-3 py-1.5 text-xs font-medium hover:bg-success/90 disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Confirm Reimbursement'}
                </button>
                <button onClick={() => { setShowReimburse(false); setPayrollId(''); }} className="w-full rounded-md bg-secondary text-secondary-foreground px-3 py-1.5 text-xs hover:bg-secondary/80">
                  Cancel
                </button>
              </div>
            )}

            {canCancelClaim && !showCancel && (
              <button
                onClick={() => setShowCancel(true)}
                disabled={actionLoading}
                className="w-full rounded-md bg-destructive-soft text-destructive px-4 py-2 text-sm font-medium hover:bg-destructive/20 disabled:opacity-50"
              >
                Cancel Claim
              </button>
            )}

            {showCancel && (
              <div className="space-y-2 rounded-md border border-destructive/20 bg-destructive-soft p-3">
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation (optional)"
                  rows={2}
                  className="w-full rounded border border-input px-2 py-1.5 text-sm bg-card text-foreground"
                />
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="w-full rounded-md bg-destructive text-destructive-foreground px-3 py-1.5 text-xs font-medium hover:bg-destructive/90 disabled:opacity-50"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
                <button onClick={() => setShowCancel(false)} className="w-full rounded-md bg-secondary text-secondary-foreground px-3 py-1.5 text-xs hover:bg-secondary/80">
                  Back
                </button>
              </div>
            )}

            {!canSubmitClaim && !canReviewClaim && !canReimburseClaim && !canCancelClaim && (
              <p className="text-xs text-muted-foreground">No actions available.</p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">Created</h3>
            <p className="text-sm text-foreground">{formatDate(claim.createdAt)}</p>
          </div>
          {claim.finalDecisionBy && (
            <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
              <h3 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">Final Decision</h3>
              <p className="text-sm text-foreground">{employeeName(claim.finalDecisionBy)}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(claim.finalDecisionAt)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
