'use client';

import { useEffect, useState } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
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
  useDocumentTitle('Application');
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
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Application Details</h3>
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
                  <span className="inline-flex items-center rounded-full bg-info-soft px-2.5 py-0.5 text-xs font-medium text-info">
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
                <h4 className="text-sm font-medium text-foreground">Cover Letter</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{app.coverLetter}</p>
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
            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
              <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Stage History</h3>
              <div className="space-y-3">
                {app.stageHistory.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 rounded-md border border-border p-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {h.fromStage ? `${h.fromStage.name} → ` : ''}{h.toStage?.name || '—'}
                      </div>
                      {h.notes && <p className="mt-1 text-sm text-muted-foreground/70">{h.notes}</p>}
                      <p className="mt-1 text-xs text-muted-foreground/70">
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
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">Interviews</h3>
              {isActive && can('recruitment.interview.manage') && (
                <Link
                  href={`/recruitment/interviews/new?applicationId=${id}`}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 motion-press"
                >
                  Schedule Interview
                </Link>
              )}
            </div>
            {interviews && interviews.length > 0 ? (
              <div className="overflow-hidden rounded-md border border-border">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Scheduled</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Mode</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {interviews.map((iv) => (
                      <tr key={iv.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-3 py-2 text-sm">
                          <Link href={`/recruitment/interviews/${iv.id}`} className="font-medium text-primary hover:underline">
                            {iv.type.replace(/_/g, ' ')}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(iv.scheduledAt)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{iv.mode.replace(/_/g, ' ')}</td>
                        <td className="px-3 py-2"><StatusBadge status={iv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>
            )}
          </div>

          {/* Offers */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">Offers</h3>
              {isActive && can('recruitment.offer.manage') && (
                <Link
                  href={`/recruitment/offers/new?applicationId=${id}`}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 motion-press"
                >
                  Create Offer
                </Link>
              )}
            </div>
            {offers && offers.length > 0 ? (
              <div className="overflow-hidden rounded-md border border-border">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Offer #</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Salary</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Joining</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {offers.map((offer) => (
                      <tr key={offer.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-3 py-2 text-sm">
                          <Link href={`/recruitment/offers/${offer.id}`} className="font-medium text-primary hover:underline">
                            {offer.offerNumber}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{formatCurrency(offer.baseSalary)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(offer.proposedJoiningDate)}</td>
                        <td className="px-3 py-2"><StatusBadge status={offer.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No offers created yet.</p>
            )}
          </div>
        </div>

        {/* Sidebar actions */}
        <div className="space-y-4">
          {isActive && can('recruitment.application.manage') && (
            <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
              <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Actions</h3>
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
                                ? 'border-primary bg-primary/10 text-primary'
                                : stage.isHired
                                ? 'border-success text-success hover:bg-success-soft/30'
                                : stage.isRejected
                                ? 'border-destructive text-destructive hover:bg-destructive-soft/30'
                                : 'border-border text-foreground hover:bg-muted/50'
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
                                className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1 text-xs focus:border-primary focus:outline-none"
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
                                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 motion-press disabled:opacity-50"
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
                    className="w-full rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 motion-press disabled:opacity-50"
                  >
                    Reject
                  </button>
                ) : (
                  <div className="rounded-md border border-destructive/20 bg-destructive-soft p-3 space-y-2">
                    <label className="block text-xs font-medium text-destructive">Rejection Reason *</label>
                    <select
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value as ApplicationRejectionReason | '')}
                      className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
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
                      className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1 text-xs focus:border-primary focus:outline-none"
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
                        className="rounded-md bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 motion-press disabled:opacity-50"
                      >
                        {acting ? 'Rejecting...' : 'Confirm Reject'}
                      </button>
                      <button
                        onClick={() => { setShowRejectForm(false); setRejectReason(''); setRejectNotes(''); }}
                        className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 motion-press"
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
                    className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 motion-press disabled:opacity-50"
                  >
                    Withdraw
                  </button>
                ) : (
                  <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                    <label className="block text-xs font-medium text-foreground">Withdrawal Reason</label>
                    <textarea
                      placeholder="Reason (optional)"
                      value={withdrawReason}
                      onChange={(e) => setWithdrawReason(e.target.value)}
                      rows={2}
                      className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1 text-xs focus:border-primary focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={acting}
                        onClick={() =>
                          doAction(() =>
                            withdrawApplication(id, { reason: withdrawReason.trim() || undefined }),
                          )
                        }
                        className="rounded-md bg-foreground/90 px-3 py-1 text-xs font-medium text-background hover:bg-foreground motion-press disabled:opacity-50"
                      >
                        {acting ? 'Withdrawing...' : 'Confirm Withdraw'}
                      </button>
                      <button
                        onClick={() => { setShowWithdrawForm(false); setWithdrawReason(''); }}
                        className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 motion-press"
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

          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">Created</h3>
            <p className="text-sm text-muted-foreground">{formatDate(app.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
