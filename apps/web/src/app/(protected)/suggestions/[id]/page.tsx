'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { useDocumentTitle } from '@/lib/use-document-title';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { LoadingButton } from '@/components/ui/loading-button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/toast';
import { useAsync, usePermission } from '@/lib/hooks';
import {
  getSuggestion,
  respondToSuggestion,
  updateSuggestionStatus,
} from '@/lib/suggestions-api';
import { formatDate, formatDateTime, employeeName } from '@/lib/format';
import type {
  Suggestion,
  SuggestionCategory,
  SuggestionStatus,
} from '@/types/suggestion';

const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  WORKPLACE: 'Workplace',
  PROCESS: 'Process',
  TOOLS: 'Tools',
  CULTURE: 'Culture',
  COMPENSATION: 'Compensation',
  OTHER: 'Other',
};

const STATUSES: SuggestionStatus[] = [
  'OPEN',
  'IN_REVIEW',
  'IMPLEMENTED',
  'DECLINED',
  'ARCHIVED',
];

function authorLabel(s: Suggestion): string {
  if (s.isAnonymous || !s.author) return 'Anonymous';
  return employeeName(s.author);
}

export default function SuggestionDetailPage() {
  useDocumentTitle('Suggestion');
  const { id } = useParams<{ id: string }>();
  const { can } = usePermission();
  const toast = useToast();
  const confirm = useConfirm();

  const canManage = can('suggestion.manage');

  const { data: suggestion, error, errorStatus, loading, refetch } = useAsync(
    () => getSuggestion(id),
    [id],
  );

  const [responseBody, setResponseBody] = useState('');
  const [responseStatus, setResponseStatus] =
    useState<SuggestionStatus>('IN_REVIEW');
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');

  // Pre-populate the admin response form when an existing response is loaded.
  useEffect(() => {
    if (canManage && suggestion?.responseBody) {
      setResponseBody(suggestion.responseBody);
      setResponseStatus(suggestion.status);
    }
    // We only want to seed once per suggestion id load, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion?.id]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Suggestion" backHref="/suggestions" />
        <Loading />
      </div>
    );
  }

  if (error || !suggestion) {
    return (
      <div>
        <PageHeader title="Suggestion" backHref="/suggestions" />
        <ErrorMessage
          message={error ?? 'Suggestion not found'}
          status={errorStatus}
          onRetry={refetch}
        />
      </div>
    );
  }

  async function submitResponse(
    e: FormEvent,
    overrideStatus?: SuggestionStatus,
  ) {
    e.preventDefault();
    if (acting) return;
    if (!responseBody.trim()) {
      setActionError('Please write a response before saving');
      return;
    }
    setActing(true);
    setActionError('');
    try {
      await respondToSuggestion(id, {
        responseBody: responseBody.trim(),
        status: overrideStatus ?? responseStatus,
      });
      toast.success('Response saved');
      refetch();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to save response',
      );
    } finally {
      setActing(false);
    }
  }

  async function handleStatusOnly(next: SuggestionStatus) {
    if (!suggestion) return;
    if (acting || suggestion.status === next) return;
    if (next === 'ARCHIVED') {
      const ok = await confirm({
        title: 'Archive this suggestion?',
        description: 'It will be hidden from the active inbox view.',
        confirmLabel: 'Archive',
        cancelLabel: 'Cancel',
        tone: 'default',
      });
      if (!ok) return;
    }
    setActing(true);
    setActionError('');
    try {
      await updateSuggestionStatus(id, { status: next });
      toast.success(`Status set to ${next.replace('_', ' ')}`);
      refetch();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to update status',
      );
    } finally {
      setActing(false);
    }
  }

  const inputCls =
    'mt-1 block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';
  const labelCls = 'block text-sm font-medium text-foreground/80';

  return (
    <div>
      <PageHeader title={suggestion.title} backHref="/suggestions" />

      {actionError && (
        <div className="mb-4">
          <ErrorMessage message={actionError} />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          {/* Body card */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusBadge status={suggestion.status} />
              <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-secondary-foreground">
                {CATEGORY_LABELS[suggestion.category]}
              </span>
              {suggestion.isAnonymous && (
                <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning-soft px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-warning">
                  Anonymous
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground/90">
              {suggestion.body}
            </p>
          </div>

          {/* Response card (read-only for author) */}
          {!canManage && suggestion.responseBody && (
            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                Response
              </h3>
              <p className="whitespace-pre-wrap text-sm text-foreground/90">
                {suggestion.responseBody}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {employeeName(suggestion.respondedBy)}
                {suggestion.respondedAt
                  ? ` · ${formatDateTime(suggestion.respondedAt)}`
                  : ''}
              </p>
            </div>
          )}

          {!canManage && !suggestion.responseBody && (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              No response yet. We will notify you here once HR has reviewed
              this.
            </div>
          )}

          {/* Admin response form */}
          {canManage && (
            <form
              onSubmit={(e) => submitResponse(e)}
              className="rounded-lg border border-border bg-card p-6 shadow-soft"
            >
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {suggestion.responseBody ? 'Update response' : 'Respond'}
              </h3>

              <label className={labelCls}>Response</label>
              <textarea
                rows={5}
                maxLength={5000}
                value={responseBody}
                onChange={(e) => setResponseBody(e.target.value)}
                className={inputCls}
                placeholder="Acknowledge the suggestion and explain next steps."
              />

              <div className="mt-4">
                <label className={labelCls}>Status</label>
                <select
                  value={responseStatus}
                  onChange={(e) =>
                    setResponseStatus(e.target.value as SuggestionStatus)
                  }
                  className={inputCls}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <LoadingButton type="submit" loading={acting} loadingText="Saving…">
                  Save response
                </LoadingButton>
                <button
                  type="button"
                  disabled={acting || !responseBody.trim()}
                  onClick={(e) => submitResponse(e, 'IMPLEMENTED')}
                  className="motion-press rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground transition-colors hover:bg-success/90 disabled:opacity-60"
                >
                  Implement
                </button>
                <button
                  type="button"
                  disabled={acting || !responseBody.trim()}
                  onClick={(e) => submitResponse(e, 'DECLINED')}
                  className="motion-press rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
                >
                  Decline
                </button>
                {suggestion.status !== 'ARCHIVED' && (
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => handleStatusOnly('ARCHIVED')}
                    className="motion-press rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-60"
                  >
                    Archive
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Details
            </h3>
            <dl className="space-y-1">
              <DetailRow label="From">{authorLabel(suggestion)}</DetailRow>
              <DetailRow label="Category">
                {CATEGORY_LABELS[suggestion.category]}
              </DetailRow>
              <DetailRow label="Status">
                <StatusBadge status={suggestion.status} />
              </DetailRow>
              <DetailRow label="Submitted">
                {formatDate(suggestion.createdAt)}
              </DetailRow>
              {suggestion.respondedAt && (
                <DetailRow label="Responded">
                  {formatDateTime(suggestion.respondedAt)}
                </DetailRow>
              )}
              {suggestion.respondedBy && (
                <DetailRow label="Responder">
                  {employeeName(suggestion.respondedBy)}
                </DetailRow>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
