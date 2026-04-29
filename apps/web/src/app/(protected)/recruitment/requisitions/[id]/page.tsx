'use client';

import { useState } from 'react';
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
        <div className="lg:col-span-2 rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Details</h3>
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
              <h4 className="text-sm font-medium text-gray-700">Description</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{req.description}</p>
            </div>
          )}

          {req.requirements && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700">Requirements</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{req.requirements}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Actions</h3>
            <div className="space-y-2">
              {canSubmit && (
                <button
                  disabled={acting}
                  onClick={() => doAction(() => submitRequisition(id))}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {acting ? 'Submitting...' : 'Submit for Approval'}
                </button>
              )}
              {canReview && (
                <>
                  <button
                    disabled={acting}
                    onClick={() => doAction(() => reviewRequisition(id, { decision: 'APPROVED' }))}
                    className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {acting ? 'Approving...' : 'Approve'}
                  </button>
                  {!showRejectForm ? (
                    <button
                      disabled={acting}
                      onClick={() => setShowRejectForm(true)}
                      className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  ) : (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-2">
                      <textarea
                        placeholder="Rejection reason (optional)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        className="block w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-red-500 focus:outline-none"
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
                          className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {acting ? 'Rejecting...' : 'Confirm Reject'}
                        </button>
                        <button
                          onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                          className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
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
                      className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Close Requisition
                    </button>
                  ) : (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
                      <textarea
                        placeholder="Close reason (optional)"
                        value={closeReason}
                        onChange={(e) => setCloseReason(e.target.value)}
                        rows={2}
                        className="block w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={acting}
                          onClick={() =>
                            doAction(() =>
                              closeRequisition(id, { reason: closeReason.trim() || undefined }),
                            )
                          }
                          className="rounded-md bg-gray-700 px-3 py-1 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                        >
                          {acting ? 'Closing...' : 'Confirm Close'}
                        </button>
                        <button
                          onClick={() => { setShowCloseForm(false); setCloseReason(''); }}
                          className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
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
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                View Applications
              </button>
            </div>
            {actionError && <div className="mt-3"><ErrorMessage message={actionError} /></div>}
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold uppercase text-gray-500">Created</h3>
            <p className="text-sm text-gray-600">{formatDate(req.createdAt)}</p>
            {req.createdBy && (
              <p className="text-sm text-gray-500">by {employeeName(req.createdBy)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
