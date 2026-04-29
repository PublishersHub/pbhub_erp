'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { FileLinkCard } from '@/components/files/file-link-card';
import { useAsync, usePermission } from '@/lib/hooks';
import {
  getApplication,
  moveApplicationStage,
  rejectApplication,
  withdrawApplication,
  listPostingStages,
  listInterviews,
  listOffers,
} from '@/lib/recruitment-api';
import { formatDate, formatDateTime, formatCurrency, employeeName } from '@/lib/format';
import type { ApplicationRejectionReason } from '@/types/recruitment';

const REJECTION_REASONS: ApplicationRejectionReason[] = [
  'NOT_QUALIFIED', 'FAILED_INTERVIEW', 'FAILED_ASSESSMENT', 'CULTURAL_FIT',
  'COMPENSATION_MISMATCH', 'POSITION_FILLED', 'DUPLICATE', 'OTHER',
];

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermission();
  const { data: app, error, loading, refetch } = useAsync(() => getApplication(id), [id]);
  const [actionError, setActionError] = useState('');
  const [acting, setActing] = useState(false);

  // Rejection form state
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState<ApplicationRejectionReason | ''>('');
  const [rejectNotes, setRejectNotes] = useState('');

  // Withdraw form state
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');

  // Stage move notes
  const [movingStageId, setMovingStageId] = useState<string | null>(null);
  const [stageNotes, setStageNotes] = useState('');

  // Load stages when we have a posting
  const { data: stages } = useAsync(
    () => (app?.jobPostingId ? listPostingStages(app.jobPostingId) : Promise.resolve([])),
    [app?.jobPostingId],
  );

  // Load interviews and offers for this application
  const { data: interviews } = useAsync(() => listInterviews(id), [id]);
  const { data: offers } = useAsync(() => listOffers(id), [id]);

  async function doAction(fn: () => Promise<unknown>) {
    setActionError('');
    setActing(true);
    try {
      await fn();
      setShowRejectForm(false);
      setShowWithdrawForm(false);
      setMovingStageId(null);
      setStageNotes('');
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!app) return null;

  const isActive = !['REJECTED', 'WITHDRAWN', 'HIRED'].includes(app.status);
  const availableStages = stages?.filter((s) => s.id !== app.currentStageId) || [];

  return (
    <div>
      <PageHeader
        title={
          app.candidate
            ? `${app.candidate.firstName} ${app.candidate.lastName}`
            : 'Application'
        }
        description={app.jobRequisition?.title}
        backHref="/recruitment/applications"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={app.status} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Application Details</h3>
            <dl>
              <DetailRow label="Candidate">
                {app.candidate ? (
                  <Link href={`/recruitment/candidates/${app.candidateId}`} className="text-blue-600 hover:underline">
                    {app.candidate.firstName} {app.candidate.lastName}
                  </Link>
                ) : (
                  app.candidateId
                )}
              </DetailRow>
              <DetailRow label="Requisition">
                {app.jobRequisition ? (
                  <Link href={`/recruitment/requisitions/${app.jobRequisitionId}`} className="text-blue-600 hover:underline">
                    {app.jobRequisition.requisitionNumber} — {app.jobRequisition.title}
                  </Link>
                ) : (
                  app.jobRequisitionId
                )}
              </DetailRow>
              <DetailRow label="Posting">{app.jobPosting?.title || '—'}</DetailRow>
              <DetailRow label="Current Stage">
                {app.currentStage ? (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {app.currentStage.name}
                  </span>
                ) : '—'}
              </DetailRow>
              <DetailRow label="Source">{app.source.replace(/_/g, ' ')}</DetailRow>
              <DetailRow label="Expected Salary">{formatCurrency(app.expectedSalary)}</DetailRow>
              <DetailRow label="Applied">{formatDate(app.appliedAt)}</DetailRow>
              {app.referrer && (
                <DetailRow label="Referrer">{employeeName(app.referrer)}</DetailRow>
              )}
              {app.rejectionReason && (
                <DetailRow label="Rejection Reason">{app.rejectionReason.replace(/_/g, ' ')}</DetailRow>
              )}
              {app.rejectionNotes && (
                <DetailRow label="Rejection Notes">{app.rejectionNotes}</DetailRow>
              )}
              {app.rejectedAt && (
                <DetailRow label="Rejected">{formatDate(app.rejectedAt)}</DetailRow>
              )}
              {app.withdrawnReason && (
                <DetailRow label="Withdrawn Reason">{app.withdrawnReason}</DetailRow>
              )}
              {app.withdrawnAt && (
                <DetailRow label="Withdrawn">{formatDate(app.withdrawnAt)}</DetailRow>
              )}
              {app.hiredAt && (
                <DetailRow label="Hired">{formatDate(app.hiredAt)}</DetailRow>
              )}
            </dl>

            {app.coverLetter && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700">Cover Letter</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{app.coverLetter}</p>
              </div>
            )}

            {app.resumeUrl && (
              <div className="mt-4">
                <FileLinkCard
                  label="Resume"
                  fileUrl={app.resumeUrl}
                  fileName={app.resumeFileName || undefined}
                />
              </div>
            )}
          </div>

          {/* Stage History */}
          {app.stageHistory && app.stageHistory.length > 0 && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Stage History</h3>
              <div className="space-y-3">
                {app.stageHistory.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 rounded-md border border-gray-100 p-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {h.fromStage ? `${h.fromStage.name} → ` : ''}{h.toStage?.name || '—'}
                      </div>
                      {h.notes && <p className="mt-1 text-sm text-gray-500">{h.notes}</p>}
                      <p className="mt-1 text-xs text-gray-400">
                        {formatDate(h.createdAt)}
                        {h.movedBy ? ` by ${employeeName(h.movedBy)}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interviews */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase text-gray-500">Interviews</h3>
              {isActive && can('recruitment.interview.manage') && (
                <Link
                  href={`/recruitment/interviews/new?applicationId=${id}`}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Schedule Interview
                </Link>
              )}
            </div>
            {interviews && interviews.length > 0 ? (
              <div className="overflow-hidden rounded-md border">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Scheduled</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Mode</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {interviews.map((iv) => (
                      <tr key={iv.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm">
                          <Link href={`/recruitment/interviews/${iv.id}`} className="font-medium text-blue-600 hover:underline">
                            {iv.type.replace(/_/g, ' ')}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">{formatDateTime(iv.scheduledAt)}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">{iv.mode.replace(/_/g, ' ')}</td>
                        <td className="px-3 py-2"><StatusBadge status={iv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No interviews scheduled yet.</p>
            )}
          </div>

          {/* Offers */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase text-gray-500">Offers</h3>
              {isActive && can('recruitment.offer.manage') && (
                <Link
                  href={`/recruitment/offers/new?applicationId=${id}`}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  Create Offer
                </Link>
              )}
            </div>
            {offers && offers.length > 0 ? (
              <div className="overflow-hidden rounded-md border">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Offer #</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Salary</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Joining</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {offers.map((offer) => (
                      <tr key={offer.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm">
                          <Link href={`/recruitment/offers/${offer.id}`} className="font-medium text-blue-600 hover:underline">
                            {offer.offerNumber}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">{formatCurrency(offer.baseSalary)}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">{formatDate(offer.proposedJoiningDate)}</td>
                        <td className="px-3 py-2"><StatusBadge status={offer.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No offers created yet.</p>
            )}
          </div>
        </div>

        {/* Sidebar actions */}
        <div className="space-y-4">
          {isActive && can('recruitment.application.manage') && (
            <div className="rounded-lg border bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Actions</h3>
              <div className="space-y-2">
                {/* Move stage */}
                {availableStages.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Move to Stage</label>
                    <div className="space-y-1">
                      {availableStages.map((stage) => (
                        <div key={stage.id}>
                          <button
                            disabled={acting}
                            onClick={() => setMovingStageId(movingStageId === stage.id ? null : stage.id)}
                            className={`w-full rounded-md border px-3 py-1.5 text-left text-sm font-medium disabled:opacity-50 ${
                              movingStageId === stage.id
                                ? 'border-blue-400 bg-blue-50 text-blue-700'
                                : stage.isHired
                                ? 'border-green-300 text-green-700 hover:bg-green-50'
                                : stage.isRejected
                                ? 'border-red-300 text-red-700 hover:bg-red-50'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {stage.name}
                          </button>
                          {movingStageId === stage.id && (
                            <div className="mt-1 ml-2 space-y-1">
                              <textarea
                                placeholder="Notes (optional)"
                                value={stageNotes}
                                onChange={(e) => setStageNotes(e.target.value)}
                                rows={2}
                                className="block w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                              />
                              <button
                                disabled={acting}
                                onClick={() =>
                                  doAction(() =>
                                    moveApplicationStage(id, {
                                      toStageId: stage.id,
                                      notes: stageNotes.trim() || undefined,
                                    }),
                                  )
                                }
                                className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                {acting ? 'Moving...' : 'Confirm Move'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reject */}
                {!showRejectForm ? (
                  <button
                    disabled={acting}
                    onClick={() => { setShowRejectForm(true); setShowWithdrawForm(false); }}
                    className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                ) : (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-2">
                    <label className="block text-xs font-medium text-red-700">Rejection Reason *</label>
                    <select
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value as ApplicationRejectionReason | '')}
                      className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none"
                    >
                      <option value="">Select reason...</option>
                      {REJECTION_REASONS.map((r) => (
                        <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                    <textarea
                      placeholder="Additional notes (optional)"
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      rows={2}
                      className="block w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-red-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={acting || !rejectReason}
                        onClick={() =>
                          doAction(() =>
                            rejectApplication(id, {
                              reason: rejectReason as ApplicationRejectionReason,
                              notes: rejectNotes.trim() || undefined,
                            }),
                          )
                        }
                        className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {acting ? 'Rejecting...' : 'Confirm Reject'}
                      </button>
                      <button
                        onClick={() => { setShowRejectForm(false); setRejectReason(''); setRejectNotes(''); }}
                        className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Withdraw */}
                {!showWithdrawForm ? (
                  <button
                    disabled={acting}
                    onClick={() => { setShowWithdrawForm(true); setShowRejectForm(false); }}
                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Withdraw
                  </button>
                ) : (
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
                    <label className="block text-xs font-medium text-gray-700">Withdrawal Reason</label>
                    <textarea
                      placeholder="Reason (optional)"
                      value={withdrawReason}
                      onChange={(e) => setWithdrawReason(e.target.value)}
                      rows={2}
                      className="block w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={acting}
                        onClick={() =>
                          doAction(() =>
                            withdrawApplication(id, { reason: withdrawReason.trim() || undefined }),
                          )
                        }
                        className="rounded-md bg-gray-700 px-3 py-1 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        {acting ? 'Withdrawing...' : 'Confirm Withdraw'}
                      </button>
                      <button
                        onClick={() => { setShowWithdrawForm(false); setWithdrawReason(''); }}
                        className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {actionError && <div className="mt-3"><ErrorMessage message={actionError} /></div>}
            </div>
          )}

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold uppercase text-gray-500">Created</h3>
            <p className="text-sm text-gray-600">{formatDate(app.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
