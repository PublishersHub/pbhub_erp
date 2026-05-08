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
import { useAsync, usePermission } from '@/lib/hooks';
import {
  getInterview,
  rescheduleInterview,
  cancelInterview,
  submitFeedback,
} from '@/lib/recruitment-api';
import { formatDateTime, employeeName } from '@/lib/format';
import type { InterviewRecommendation } from '@/types/recruitment';

const RECOMMENDATIONS: InterviewRecommendation[] = [
  'STRONG_HIRE', 'HIRE', 'NEEDS_ANOTHER_ROUND', 'NO_HIRE', 'STRONG_NO_HIRE',
];

export default function InterviewDetailPage() {
  useDocumentTitle('Interview');
  const { id } = useParams<{ id: string }>();
  const { can } = usePermission();
  const { data: interview, error, loading, refetch } = useAsync(() => getInterview(id), [id]);
  const [actionError, setActionError] = useState('');
  const [acting, setActing] = useState(false);

  // Reschedule form
  const [showReschedule, setShowReschedule] = useState(false);
  const [newScheduledAt, setNewScheduledAt] = useState('');
  const [newDuration, setNewDuration] = useState(60);

  // Cancel form
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Feedback form
  const [showFeedback, setShowFeedback] = useState(false);
  const [fbRating, setFbRating] = useState(3);
  const [fbRecommendation, setFbRecommendation] = useState<InterviewRecommendation | ''>('');
  const [fbStrengths, setFbStrengths] = useState('');
  const [fbWeaknesses, setFbWeaknesses] = useState('');
  const [fbComments, setFbComments] = useState('');

  async function doAction(fn: () => Promise<unknown>) {
    setActionError('');
    setActing(true);
    try {
      await fn();
      setShowReschedule(false);
      setShowCancel(false);
      setShowFeedback(false);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!interview) return null;

  const isActive = !['CANCELLED', 'COMPLETED'].includes(interview.status);
  const canManage = can('recruitment.interview.manage');
  const candidateName = interview.application?.candidate
    ? `${interview.application.candidate.firstName} ${interview.application.candidate.lastName}`
    : null;

  return (
    <div>
      <PageHeader
        title={`${interview.type.replace(/_/g, ' ')} Interview`}
        description={candidateName || undefined}
        backHref={`/recruitment/interviews?applicationId=${interview.applicationId}`}
        actions={<StatusBadge status={interview.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Details</h3>
            <dl>
              <DetailRow label="Type">{interview.type.replace(/_/g, ' ')}</DetailRow>
              <DetailRow label="Mode">{interview.mode.replace(/_/g, ' ')}</DetailRow>
              <DetailRow label="Scheduled">{formatDateTime(interview.scheduledAt)}</DetailRow>
              <DetailRow label="Duration">{interview.durationMinutes} minutes</DetailRow>
              <DetailRow label="Location">{interview.location}</DetailRow>
              <DetailRow label="Meeting URL">
                {interview.meetingUrl ? (
                  <a href={interview.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Join Meeting
                  </a>
                ) : null}
              </DetailRow>
              <DetailRow label="Application">
                <Link href={`/recruitment/applications/${interview.applicationId}`} className="text-blue-600 hover:underline">
                  {interview.application?.jobRequisition?.title || interview.applicationId}
                </Link>
              </DetailRow>
              <DetailRow label="Scheduled By">{interview.scheduledBy ? employeeName(interview.scheduledBy) : null}</DetailRow>
              {interview.cancelReason && <DetailRow label="Cancel Reason">{interview.cancelReason}</DetailRow>}
              {interview.notes && <DetailRow label="Notes">{interview.notes}</DetailRow>}
            </dl>
          </div>

          {/* Panelists */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Panelists</h3>
            {interview.interviewers && interview.interviewers.length > 0 ? (
              <div className="space-y-2">
                {interview.interviewers.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-md border border-border p-3">
                    <span className="text-sm font-medium text-foreground">
                      {p.employee ? employeeName(p.employee) : p.employeeId}
                    </span>
                    {p.isPrimary && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">Primary</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No panelists assigned</p>
            )}
          </div>

          {/* Feedback */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Feedback</h3>
            {interview.feedback && interview.feedback.length > 0 ? (
              <div className="space-y-4">
                {interview.feedback.map((fb) => (
                  <div key={fb.id} className="rounded-md border border-border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {fb.panelist ? employeeName(fb.panelist) : fb.panelistEmployeeId}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rating: {fb.rating}/5</span>
                        <StatusBadge status={fb.recommendation} />
                      </div>
                    </div>
                    {fb.strengths && (
                      <div className="mt-2">
                        <span className="text-xs font-medium text-success">Strengths: </span>
                        <span className="text-xs text-muted-foreground">{fb.strengths}</span>
                      </div>
                    )}
                    {fb.weaknesses && (
                      <div className="mt-1">
                        <span className="text-xs font-medium text-destructive">Weaknesses: </span>
                        <span className="text-xs text-muted-foreground">{fb.weaknesses}</span>
                      </div>
                    )}
                    {fb.comments && (
                      <p className="mt-2 text-xs text-muted-foreground/70">{fb.comments}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No feedback submitted yet</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Actions</h3>
            <div className="space-y-2">
              {/* Submit Feedback */}
              {!showFeedback && isActive && canManage && (
                <button
                  onClick={() => { setShowFeedback(true); setShowReschedule(false); setShowCancel(false); }}
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 motion-press"
                >
                  Submit Feedback
                </button>
              )}
              {showFeedback && (
                <div className="rounded-md border border-primary/20 bg-primary/10 p-3 space-y-2">
                  <label className="block text-xs font-medium text-primary">Rating * (1-5)</label>
                  <input
                    type="number" min={1} max={5} value={fbRating}
                    onChange={(e) => setFbRating(parseInt(e.target.value) || 3)}
                    className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                  />
                  <label className="block text-xs font-medium text-primary">Recommendation *</label>
                  <select
                    value={fbRecommendation}
                    onChange={(e) => setFbRecommendation(e.target.value as InterviewRecommendation)}
                    className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="">Select...</option>
                    {RECOMMENDATIONS.map((r) => (
                      <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <textarea placeholder="Strengths" value={fbStrengths} onChange={(e) => setFbStrengths(e.target.value)} rows={2} className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1 text-xs focus:border-primary focus:outline-none" />
                  <textarea placeholder="Weaknesses" value={fbWeaknesses} onChange={(e) => setFbWeaknesses(e.target.value)} rows={2} className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1 text-xs focus:border-primary focus:outline-none" />
                  <textarea placeholder="Comments" value={fbComments} onChange={(e) => setFbComments(e.target.value)} rows={2} className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1 text-xs focus:border-primary focus:outline-none" />
                  <div className="flex gap-2">
                    <button
                      disabled={acting || !fbRecommendation}
                      onClick={() => doAction(() => submitFeedback(id, {
                        rating: fbRating,
                        recommendation: fbRecommendation as InterviewRecommendation,
                        ...(fbStrengths.trim() && { strengths: fbStrengths.trim() }),
                        ...(fbWeaknesses.trim() && { weaknesses: fbWeaknesses.trim() }),
                        ...(fbComments.trim() && { comments: fbComments.trim() }),
                      }))}
                      className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 motion-press disabled:opacity-50"
                    >
                      {acting ? 'Submitting...' : 'Submit'}
                    </button>
                    <button onClick={() => setShowFeedback(false)} className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 motion-press">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Reschedule */}
              {isActive && canManage && !showReschedule ? (
                <button
                  onClick={() => { setShowReschedule(true); setShowCancel(false); setShowFeedback(false); }}
                  className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 motion-press"
                >
                  Reschedule
                </button>
              ) : isActive && canManage && showReschedule ? (
                <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                  <label className="block text-xs font-medium text-foreground">New Date & Time *</label>
                  <input type="datetime-local" required value={newScheduledAt} onChange={(e) => setNewScheduledAt(e.target.value)} className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1.5 text-xs focus:border-primary focus:outline-none" />
                  <label className="block text-xs font-medium text-foreground">Duration (min)</label>
                  <input type="number" min={15} value={newDuration} onChange={(e) => setNewDuration(parseInt(e.target.value) || 60)} className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1.5 text-xs focus:border-primary focus:outline-none" />
                  <div className="flex gap-2">
                    <button
                      disabled={acting || !newScheduledAt}
                      onClick={() => doAction(() => rescheduleInterview(id, {
                        scheduledAt: new Date(newScheduledAt).toISOString(),
                        durationMinutes: newDuration,
                      }))}
                      className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 motion-press disabled:opacity-50"
                    >
                      {acting ? 'Rescheduling...' : 'Confirm'}
                    </button>
                    <button onClick={() => setShowReschedule(false)} className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 motion-press">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Cancel */}
              {isActive && canManage && !showCancel ? (
                <button
                  onClick={() => { setShowCancel(true); setShowReschedule(false); setShowFeedback(false); }}
                  className="w-full rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 motion-press"
                >
                  Cancel Interview
                </button>
              ) : isActive && canManage && showCancel ? (
                <div className="rounded-md border border-destructive/20 bg-destructive-soft p-3 space-y-2">
                  <textarea placeholder="Cancel reason (optional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1 text-xs focus:border-primary focus:outline-none" />
                  <div className="flex gap-2">
                    <button
                      disabled={acting}
                      onClick={() => doAction(() => cancelInterview(id, { reason: cancelReason.trim() || undefined }))}
                      className="rounded-md bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 motion-press disabled:opacity-50"
                    >
                      {acting ? 'Cancelling...' : 'Confirm Cancel'}
                    </button>
                    <button onClick={() => setShowCancel(false)} className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 motion-press">
                      Back
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            {actionError && <div className="mt-3"><ErrorMessage message={actionError} /></div>}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">Created</h3>
            <p className="text-sm text-muted-foreground">{formatDateTime(interview.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
