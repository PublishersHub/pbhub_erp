'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { useAsync, usePermission } from '@/lib/hooks';
import { getLeaveRequest, reviewLeaveRequest, cancelLeaveRequest } from '@/lib/leave-api';
import { formatDate, employeeName } from '@/lib/format';

export default function LeaveRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermission();
  const { data: req, error, loading, refetch } = useAsync(() => getLeaveRequest(id), [id]);
  const [actionError, setActionError] = useState('');
  const [acting, setActing] = useState(false);

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  async function doAction(fn: () => Promise<unknown>) {
    setActionError('');
    setActing(true);
    try {
      await fn();
      setShowRejectForm(false);
      setShowCancelForm(false);
      setRemarks('');
      setCancelReason('');
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

  const canApprove = req.status === 'PENDING' && can('leave.approve');
  const canCancel = req.status === 'PENDING' && can('leave.read_own');

  return (
    <div>
      <PageHeader
        title="Leave Request"
        backHref="/leave/requests"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={req.status} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Details</h3>
            <dl>
              <DetailRow label="Employee">{employeeName(req.employee)}</DetailRow>
              <DetailRow label="Leave Policy">{req.leavePolicy?.name}</DetailRow>
              <DetailRow label="Start Date">{formatDate(req.startDate)}</DetailRow>
              <DetailRow label="End Date">{formatDate(req.endDate)}</DetailRow>
              <DetailRow label="Total Days">
                {req.totalDays}
                {req.isHalfDay && (
                  <span className="ml-1 text-xs text-gray-400">(half-day)</span>
                )}
              </DetailRow>
              <DetailRow label="Reason">{req.reason}</DetailRow>
              <DetailRow label="Submitted">{formatDate(req.submittedAt)}</DetailRow>
              {req.finalDecisionAt && (
                <DetailRow label="Decision Date">{formatDate(req.finalDecisionAt)}</DetailRow>
              )}
              {req.finalDecisionBy && (
                <DetailRow label="Decision By">{employeeName(req.finalDecisionBy)}</DetailRow>
              )}
              {req.cancelledAt && (
                <DetailRow label="Cancelled">{formatDate(req.cancelledAt)}</DetailRow>
              )}
              {req.cancelReason && (
                <DetailRow label="Cancel Reason">{req.cancelReason}</DetailRow>
              )}
            </dl>
          </div>

          {/* Day breakdown */}
          {req.days && req.days.length > 0 && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Day Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        Type
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        Days
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {req.days.map((d) => (
                      <tr key={d.id}>
                        <td className="px-4 py-2 text-gray-700">{formatDate(d.date)}</td>
                        <td className="px-4 py-2">
                          <StatusBadge status={d.dayType} />
                        </td>
                        <td className="px-4 py-2 text-gray-600">{d.days}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Approval history */}
          {req.approvalActions && req.approvalActions.length > 0 && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
                Approval History
              </h3>
              <div className="space-y-3">
                {req.approvalActions.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 rounded-md border border-gray-100 p-3"
                  >
                    <StatusBadge status={a.action} />
                    <div className="flex-1 text-sm">
                      <p className="text-gray-900">
                        <span className="font-medium">{employeeName(a.approverEmployee)}</span>
                        <span className="ml-1 text-xs text-gray-400">({a.approverRole})</span>
                      </p>
                      {a.remarks && <p className="mt-1 text-gray-600">{a.remarks}</p>}
                      <p className="mt-1 text-xs text-gray-400">{formatDate(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Actions</h3>
            <div className="space-y-2">
              {canApprove && (
                <>
                  <button
                    disabled={acting}
                    onClick={() =>
                      doAction(() =>
                        reviewLeaveRequest(id, { action: 'APPROVED', remarks: undefined }),
                      )
                    }
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
                        placeholder="Rejection remarks (optional)"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        rows={2}
                        className="block w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-red-500 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={acting}
                          onClick={() =>
                            doAction(() =>
                              reviewLeaveRequest(id, {
                                action: 'REJECTED',
                                remarks: remarks.trim() || undefined,
                              }),
                            )
                          }
                          className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {acting ? 'Rejecting...' : 'Confirm Reject'}
                        </button>
                        <button
                          onClick={() => {
                            setShowRejectForm(false);
                            setRemarks('');
                          }}
                          className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {canCancel && (
                <>
                  {!showCancelForm ? (
                    <button
                      disabled={acting}
                      onClick={() => setShowCancelForm(true)}
                      className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel Request
                    </button>
                  ) : (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
                      <textarea
                        placeholder="Cancellation reason (optional)"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        rows={2}
                        className="block w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={acting}
                          onClick={() =>
                            doAction(() =>
                              cancelLeaveRequest(id, {
                                cancelReason: cancelReason.trim() || undefined,
                              }),
                            )
                          }
                          className="rounded-md bg-gray-700 px-3 py-1 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                        >
                          {acting ? 'Cancelling...' : 'Confirm Cancel'}
                        </button>
                        <button
                          onClick={() => {
                            setShowCancelForm(false);
                            setCancelReason('');
                          }}
                          className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {req.status !== 'PENDING' && !canApprove && (
                <p className="text-xs text-gray-400">No actions available.</p>
              )}
            </div>
            {actionError && (
              <div className="mt-3">
                <ErrorMessage message={actionError} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
