'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAsync, usePermission } from '@/lib/hooks';
import {
  getMyClaimDetail,
  getClaimDetail,
  submitExpenseClaim,
  cancelExpenseClaim,
  reviewExpenseClaim,
  reimburseExpenseClaim,
} from '@/lib/expense-api';
import { formatCurrency, formatDate, formatDateTime, employeeName } from '@/lib/format';
import type { ExpenseApprovalDecision } from '@/types/expense';

export default function ExpenseClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermission();
  const canReadAll = can('expense.read');
  const canApprove = can('expense.approve');
  const canReimburse = can('expense.reimburse');
  const canCreate = can('expense.create');

  const { data: claim, error, loading, refetch } = useAsync(
    () => (canReadAll ? getClaimDetail(id) : getMyClaimDetail(id)),
    [id, canReadAll],
  );

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
    setActionError('');
    setActionLoading(true);
    try {
      await cancelExpenseClaim(id, cancelReason.trim() ? { cancelReason: cancelReason.trim() } : undefined);
      setShowCancel(false);
      setCancelReason('');
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReview(action: ExpenseApprovalDecision) {
    setActionError('');
    setActionLoading(true);
    try {
      await reviewExpenseClaim(id, {
        action,
        ...(reviewRemarks.trim() && { remarks: reviewRemarks.trim() }),
      });
      setShowReview(false);
      setReviewRemarks('');
      refetch();
    } catch (err) {
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
    setActionError('');
    setActionLoading(true);
    try {
      await reimburseExpenseClaim(id, { payrollId: payrollId.trim() });
      setShowReimburse(false);
      setPayrollId('');
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Reimbursement failed');
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
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Claim Details</h3>
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
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
              Items ({earnings.length})
            </h3>
            {earnings.length === 0 ? (
              <p className="text-sm text-gray-500">No items.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                      <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {earnings.map((item) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                          <span className="font-medium">{item.expenseCategory?.code}</span>
                          <span className="ml-1 text-gray-400">— {item.expenseCategory?.name}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-700">{item.description}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-600">{formatDate(item.expenseDate)}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                        <td className="px-4 py-2">
                          {item.receiptUrl ? (
                            <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                              {item.receiptFileName || 'View'}
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 font-bold text-gray-900">Total</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-900">{formatCurrency(claim.totalAmount)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Approval History */}
          {approvalHistory.length > 0 && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Approval History</h3>
              <div className="space-y-3">
                {approvalHistory.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-md border border-gray-100 p-3">
                    <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${a.action === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{employeeName(a.approverEmployee)}</span>
                        <StatusBadge status={a.action} />
                        <span className="text-xs text-gray-400">as {a.approverRole}</span>
                      </div>
                      {a.remarks && <p className="mt-1 text-sm text-gray-600">{a.remarks}</p>}
                      <p className="mt-1 text-xs text-gray-400">{formatDateTime(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payroll Adjustment */}
          {claim.payrollAdjustment && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <h4 className="text-sm font-semibold text-green-800">Payroll Adjustment Created</h4>
              <p className="mt-1 text-sm text-green-700">{claim.payrollAdjustment.description}</p>
              <p className="mt-1 text-sm font-bold text-green-800">Amount: {formatCurrency(claim.payrollAdjustment.amount)}</p>
            </div>
          )}
        </div>

        {/* Sidebar actions */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold uppercase text-gray-500">Actions</h3>

            {canSubmitClaim && (
              <button
                onClick={handleSubmit}
                disabled={actionLoading}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Submitting...' : 'Submit Claim'}
              </button>
            )}

            {canReviewClaim && !showReview && (
              <button
                onClick={() => setShowReview(true)}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Review
              </button>
            )}

            {showReview && (
              <div className="space-y-2 rounded-md border border-indigo-100 bg-indigo-50 p-3">
                <textarea
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder="Remarks (optional)"
                  rows={2}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview('APPROVED')}
                    disabled={actionLoading}
                    className="flex-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview('REJECTED')}
                    disabled={actionLoading}
                    className="flex-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
                <button onClick={() => setShowReview(false)} className="w-full rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            )}

            {canReimburseClaim && !showReimburse && (
              <button
                onClick={() => setShowReimburse(true)}
                className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Reimburse
              </button>
            )}

            {showReimburse && (
              <div className="space-y-2 rounded-md border border-green-100 bg-green-50 p-3">
                <label className="block text-xs font-medium text-gray-700">Payroll Record ID *</label>
                <input
                  value={payrollId}
                  onChange={(e) => setPayrollId(e.target.value)}
                  placeholder="Paste payroll ID"
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
                <p className="text-xs text-gray-500">
                  The payroll must be in PROCESSED status for this employee.
                </p>
                <button
                  onClick={handleReimburse}
                  disabled={actionLoading}
                  className="w-full rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Confirm Reimbursement'}
                </button>
                <button onClick={() => { setShowReimburse(false); setPayrollId(''); }} className="w-full rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            )}

            {canCancelClaim && !showCancel && (
              <button
                onClick={() => setShowCancel(true)}
                className="w-full rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
              >
                Cancel Claim
              </button>
            )}

            {showCancel && (
              <div className="space-y-2 rounded-md border border-red-100 bg-red-50 p-3">
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation (optional)"
                  rows={2}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="w-full rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
                <button onClick={() => setShowCancel(false)} className="w-full rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200">
                  Back
                </button>
              </div>
            )}

            {!canSubmitClaim && !canReviewClaim && !canReimburseClaim && !canCancelClaim && (
              <p className="text-xs text-gray-500">No actions available.</p>
            )}
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold uppercase text-gray-500">Created</h3>
            <p className="text-sm text-gray-600">{formatDate(claim.createdAt)}</p>
          </div>
          {claim.finalDecisionBy && (
            <div className="rounded-lg border bg-white p-5 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold uppercase text-gray-500">Final Decision</h3>
              <p className="text-sm text-gray-600">{employeeName(claim.finalDecisionBy)}</p>
              <p className="text-xs text-gray-400">{formatDateTime(claim.finalDecisionAt)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
