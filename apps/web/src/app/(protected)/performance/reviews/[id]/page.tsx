'use client';

import { useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAsync, usePermission } from '@/lib/hooks';
import {
  getReview,
  submitSelfReview,
  submitManagerReview,
  calibrateReview,
} from '@/lib/performance-api';
import { formatDateTime, employeeName } from '@/lib/format';
import type { GoalReview } from '@/types/performance';

interface GoalReviewFormItem {
  goalId: string;
  goalTitle: string;
  rating: string;
  comment: string;
}

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermission();
  const canPerformReview = can('performance.review');
  const canManage = can('performance.manage');

  const { data: review, error, loading, refetch } = useAsync(() => getReview(id), [id]);

  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Self-review form
  const [showSelfReview, setShowSelfReview] = useState(false);
  const [selfComment, setSelfComment] = useState('');
  const [selfRating, setSelfRating] = useState('');
  const [selfGoalReviews, setSelfGoalReviews] = useState<GoalReviewFormItem[]>([]);

  // Manager review form
  const [showManagerReview, setShowManagerReview] = useState(false);
  const [mgrComment, setMgrComment] = useState('');
  const [mgrRating, setMgrRating] = useState('');
  const [mgrGoalReviews, setMgrGoalReviews] = useState<GoalReviewFormItem[]>([]);

  // Calibration form
  const [showCalibration, setShowCalibration] = useState(false);
  const [finalRating, setFinalRating] = useState('');
  const [calibrationComment, setCalibrationComment] = useState('');

  function initSelfReview() {
    const goalReviews = (review?.goalReviews ?? []).map((gr: GoalReview) => ({
      goalId: gr.goalId,
      goalTitle: gr.goal?.title ?? 'Goal',
      rating: gr.selfRating ?? '',
      comment: gr.selfComment ?? '',
    }));
    setSelfGoalReviews(goalReviews);
    setSelfComment(review?.selfComment ?? '');
    setSelfRating(review?.selfRating ?? '');
    setShowSelfReview(true);
  }

  function initManagerReview() {
    const goalReviews = (review?.goalReviews ?? []).map((gr: GoalReview) => ({
      goalId: gr.goalId,
      goalTitle: gr.goal?.title ?? 'Goal',
      rating: gr.managerRating ?? '',
      comment: gr.managerComment ?? '',
    }));
    setMgrGoalReviews(goalReviews);
    setMgrComment(review?.managerComment ?? '');
    setMgrRating(review?.managerRating ?? '');
    setShowManagerReview(true);
  }

  function updateGoalReview(
    list: GoalReviewFormItem[],
    setter: (v: GoalReviewFormItem[]) => void,
    idx: number,
    field: 'rating' | 'comment',
    value: string,
  ) {
    const updated = [...list];
    updated[idx] = { ...updated[idx], [field]: value };
    setter(updated);
  }

  async function handleSelfReview(e: FormEvent, isDraft: boolean) {
    e.preventDefault();
    setActionError('');
    setActionLoading(true);
    try {
      await submitSelfReview(id, {
        isDraft,
        ...(selfComment.trim() && { selfComment: selfComment.trim() }),
        ...(selfRating && { selfRating: parseFloat(selfRating) }),
        goalReviews: selfGoalReviews
          .filter((g) => g.rating || g.comment)
          .map((g) => ({
            goalId: g.goalId,
            ...(g.rating && { selfRating: parseFloat(g.rating) }),
            ...(g.comment.trim() && { selfComment: g.comment.trim() }),
          })),
      });
      setShowSelfReview(false);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleManagerReview(e: FormEvent, isDraft: boolean) {
    e.preventDefault();
    setActionError('');
    setActionLoading(true);
    try {
      await submitManagerReview(id, {
        isDraft,
        ...(mgrComment.trim() && { managerComment: mgrComment.trim() }),
        ...(mgrRating && { managerRating: parseFloat(mgrRating) }),
        goalReviews: mgrGoalReviews
          .filter((g) => g.rating || g.comment)
          .map((g) => ({
            goalId: g.goalId,
            ...(g.rating && { managerRating: parseFloat(g.rating) }),
            ...(g.comment.trim() && { managerComment: g.comment.trim() }),
          })),
      });
      setShowManagerReview(false);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCalibrate(e: FormEvent) {
    e.preventDefault();
    if (!finalRating) return;
    setActionError('');
    setActionLoading(true);
    try {
      await calibrateReview(id, {
        finalRating: parseFloat(finalRating),
        ...(calibrationComment.trim() && { calibrationComment: calibrationComment.trim() }),
      });
      setShowCalibration(false);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Calibration failed');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!review) return null;

  const canDoSelfReview = ['NOT_STARTED', 'SELF_REVIEW_IN_PROGRESS'].includes(review.status);
  const canDoManagerReview = canPerformReview && ['SELF_REVIEW_SUBMITTED', 'MANAGER_REVIEW_IN_PROGRESS'].includes(review.status);
  const canCalibrate = canManage && review.status === 'MANAGER_REVIEW_SUBMITTED';

  function ratingDisplay(val: string | null) {
    if (!val) return '—';
    return parseFloat(val).toFixed(2);
  }

  const inputCls = 'w-full rounded border border-gray-300 px-2 py-1.5 text-sm';

  return (
    <div>
      <PageHeader
        title={`Review — ${employeeName(review.employee)}`}
        backHref="/performance/reviews"
        actions={<StatusBadge status={review.status} />}
      />

      {actionError && (
        <div className="mb-4"><ErrorMessage message={actionError} /></div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Review details */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Review Details</h3>
            <dl>
              <DetailRow label="Employee">{employeeName(review.employee)}</DetailRow>
              <DetailRow label="Cycle">{review.cycle?.name ?? '—'}</DetailRow>
              <DetailRow label="Reviewer">{employeeName(review.reviewerEmployee)}</DetailRow>
            </dl>
          </div>

          {/* Ratings summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-white p-5 shadow-sm text-center">
              <p className="text-xs font-medium uppercase text-gray-500">Self Rating</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{ratingDisplay(review.selfRating)}</p>
              {review.selfSubmittedAt && (
                <p className="mt-1 text-xs text-gray-400">{formatDateTime(review.selfSubmittedAt)}</p>
              )}
            </div>
            <div className="rounded-lg border bg-white p-5 shadow-sm text-center">
              <p className="text-xs font-medium uppercase text-gray-500">Manager Rating</p>
              <p className="mt-1 text-2xl font-bold text-indigo-600">{ratingDisplay(review.managerRating)}</p>
              {review.managerSubmittedAt && (
                <p className="mt-1 text-xs text-gray-400">{formatDateTime(review.managerSubmittedAt)}</p>
              )}
            </div>
            <div className="rounded-lg border bg-white p-5 shadow-sm text-center">
              <p className="text-xs font-medium uppercase text-gray-500">Final Rating</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{ratingDisplay(review.finalRating)}</p>
              {review.calibratedAt && (
                <p className="mt-1 text-xs text-gray-400">{formatDateTime(review.calibratedAt)}</p>
              )}
            </div>
          </div>

          {/* Comments */}
          {(review.selfComment || review.managerComment || review.calibrationComment) && (
            <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold uppercase text-gray-500">Comments</h3>
              {review.selfComment && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Self Comment</p>
                  <p className="mt-1 text-sm text-gray-700">{review.selfComment}</p>
                </div>
              )}
              {review.managerComment && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Manager Comment</p>
                  <p className="mt-1 text-sm text-gray-700">{review.managerComment}</p>
                </div>
              )}
              {review.calibrationComment && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Calibration Comment</p>
                  <p className="mt-1 text-sm text-gray-700">{review.calibrationComment}</p>
                </div>
              )}
            </div>
          )}

          {/* Goal Reviews table */}
          {(review.goalReviews ?? []).length > 0 && !showSelfReview && !showManagerReview && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
                Goal Reviews ({review.goalReviews!.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Goal</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Weight</th>
                      <th className="px-4 py-2 text-center text-xs font-medium uppercase text-gray-500">Self Rating</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Self Comment</th>
                      <th className="px-4 py-2 text-center text-xs font-medium uppercase text-gray-500">Manager Rating</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Manager Comment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {review.goalReviews!.map((gr) => (
                      <tr key={gr.id}>
                        <td className="px-4 py-2 font-medium text-gray-900">{gr.goal?.title ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-700">{gr.goal?.weight ?? '—'}%</td>
                        <td className="px-4 py-2 text-center text-gray-700">{ratingDisplay(gr.selfRating)}</td>
                        <td className="px-4 py-2 text-gray-600">{gr.selfComment || '—'}</td>
                        <td className="px-4 py-2 text-center text-gray-700">{ratingDisplay(gr.managerRating)}</td>
                        <td className="px-4 py-2 text-gray-600">{gr.managerComment || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Self Review Form */}
          {showSelfReview && (
            <form onSubmit={(e) => handleSelfReview(e, false)} className="rounded-lg border border-blue-200 bg-blue-50 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-blue-800">Self Review</h3>

              <div>
                <label className="block text-xs font-medium text-gray-700">Overall Self Rating (1-5)</label>
                <input type="number" min="1" max="5" step="0.01" value={selfRating} onChange={(e) => setSelfRating(e.target.value)} className={inputCls} placeholder="e.g. 4.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Overall Comment</label>
                <textarea value={selfComment} onChange={(e) => setSelfComment(e.target.value)} rows={3} className={inputCls} placeholder="Describe your performance..." />
              </div>

              {selfGoalReviews.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase text-gray-600">Per-Goal Ratings</h4>
                  {selfGoalReviews.map((g, idx) => (
                    <div key={g.goalId} className="rounded-md border border-gray-200 bg-white p-3 space-y-2">
                      <p className="text-sm font-medium text-gray-900">{g.goalTitle}</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs text-gray-500">Rating (1-5)</label>
                          <input type="number" min="1" max="5" step="0.01" value={g.rating} onChange={(e) => updateGoalReview(selfGoalReviews, setSelfGoalReviews, idx, 'rating', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500">Comment</label>
                          <input value={g.comment} onChange={(e) => updateGoalReview(selfGoalReviews, setSelfGoalReviews, idx, 'comment', e.target.value)} className={inputCls} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button type="button" onClick={(e) => handleSelfReview(e as unknown as FormEvent, true)} disabled={actionLoading} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50">
                  Save Draft
                </button>
                <button type="submit" disabled={actionLoading} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {actionLoading ? 'Submitting...' : 'Submit Self Review'}
                </button>
                <button type="button" onClick={() => setShowSelfReview(false)} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Manager Review Form */}
          {showManagerReview && (
            <form onSubmit={(e) => handleManagerReview(e, false)} className="rounded-lg border border-indigo-200 bg-indigo-50 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-indigo-800">Manager Review</h3>

              <div>
                <label className="block text-xs font-medium text-gray-700">Overall Manager Rating (1-5)</label>
                <input type="number" min="1" max="5" step="0.01" value={mgrRating} onChange={(e) => setMgrRating(e.target.value)} className={inputCls} placeholder="e.g. 4.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Overall Comment</label>
                <textarea value={mgrComment} onChange={(e) => setMgrComment(e.target.value)} rows={3} className={inputCls} placeholder="Evaluate the employee's performance..." />
              </div>

              {mgrGoalReviews.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase text-gray-600">Per-Goal Ratings</h4>
                  {mgrGoalReviews.map((g, idx) => (
                    <div key={g.goalId} className="rounded-md border border-gray-200 bg-white p-3 space-y-2">
                      <p className="text-sm font-medium text-gray-900">{g.goalTitle}</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs text-gray-500">Rating (1-5)</label>
                          <input type="number" min="1" max="5" step="0.01" value={g.rating} onChange={(e) => updateGoalReview(mgrGoalReviews, setMgrGoalReviews, idx, 'rating', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500">Comment</label>
                          <input value={g.comment} onChange={(e) => updateGoalReview(mgrGoalReviews, setMgrGoalReviews, idx, 'comment', e.target.value)} className={inputCls} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button type="button" onClick={(e) => handleManagerReview(e as unknown as FormEvent, true)} disabled={actionLoading} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50">
                  Save Draft
                </button>
                <button type="submit" disabled={actionLoading} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                  {actionLoading ? 'Submitting...' : 'Submit Manager Review'}
                </button>
                <button type="button" onClick={() => setShowManagerReview(false)} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Calibration Form */}
          {showCalibration && (
            <form onSubmit={handleCalibrate} className="rounded-lg border border-purple-200 bg-purple-50 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-purple-800">Calibration</h3>
              <div>
                <label className="block text-xs font-medium text-gray-700">Final Rating (1-5) *</label>
                <input type="number" required min="1" max="5" step="0.01" value={finalRating} onChange={(e) => setFinalRating(e.target.value)} className={inputCls} placeholder="e.g. 4.25" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Calibration Comment</label>
                <textarea value={calibrationComment} onChange={(e) => setCalibrationComment(e.target.value)} rows={2} className={inputCls} placeholder="Optional notes..." />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={actionLoading} className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                  {actionLoading ? 'Saving...' : 'Finalize Rating'}
                </button>
                <button type="button" onClick={() => setShowCalibration(false)} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sidebar actions */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold uppercase text-gray-500">Actions</h3>

            {canDoSelfReview && !showSelfReview && (
              <button
                onClick={initSelfReview}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {review.status === 'NOT_STARTED' ? 'Start Self Review' : 'Continue Self Review'}
              </button>
            )}

            {canDoManagerReview && !showManagerReview && (
              <button
                onClick={initManagerReview}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {review.status === 'SELF_REVIEW_SUBMITTED' ? 'Start Manager Review' : 'Continue Manager Review'}
              </button>
            )}

            {canCalibrate && !showCalibration && (
              <button
                onClick={() => setShowCalibration(true)}
                className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Calibrate
              </button>
            )}

            {!canDoSelfReview && !canDoManagerReview && !canCalibrate && (
              <p className="text-xs text-gray-500">No actions available.</p>
            )}
          </div>

          {review.calibratedByEmployee && (
            <div className="rounded-lg border bg-white p-5 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold uppercase text-gray-500">Calibrated By</h3>
              <p className="text-sm text-gray-600">{employeeName(review.calibratedByEmployee)}</p>
              <p className="text-xs text-gray-400">{formatDateTime(review.calibratedAt)}</p>
            </div>
          )}

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold uppercase text-gray-500">Created</h3>
            <p className="text-sm text-gray-600">{formatDateTime(review.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
