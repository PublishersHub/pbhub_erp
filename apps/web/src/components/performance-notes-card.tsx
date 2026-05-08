'use client';

import { useState, type FormEvent } from 'react';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { LoadingButton } from '@/components/ui/loading-button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/toast';
import { useAsync } from '@/lib/hooks';
import {
  listPerformanceNotes,
  createPerformanceNote,
  deletePerformanceNote,
} from '@/lib/performance-api';
import { formatDate, employeeName } from '@/lib/format';

interface Props {
  employeeId: string;
  /**
   * If true, enables the "Add note" composer. Otherwise renders read-only.
   */
  canCompose: boolean;
  /**
   * Optional currentEmployeeId — used so authors can delete their own notes.
   * Falls back to author-only-server-side auth if not provided.
   */
  currentEmployeeId?: string;
}

export function PerformanceNotesCard({
  employeeId,
  canCompose,
  currentEmployeeId,
}: Props) {
  const toast = useToast();
  const confirm = useConfirm();

  const { data, error, loading, refetch } = useAsync(
    () => listPerformanceNotes(employeeId),
    [employeeId],
  );

  const [body, setBody] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || submitting) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      await createPerformanceNote(employeeId, {
        body: body.trim(),
        isPrivate,
      });
      setBody('');
      setIsPrivate(true);
      toast.success('Note added');
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add note';
      setSubmitError(msg);
      toast.error('Failed to add note', msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(noteId: string) {
    const ok = await confirm({
      title: 'Delete note?',
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deletePerformanceNote(noteId);
      toast.success('Note deleted');
      refetch();
    } catch (err) {
      toast.error(
        'Failed to delete',
        err instanceof Error ? err.message : 'Try again',
      );
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground">
          Performance Notes
        </h3>
        {data && (
          <span className="text-xs text-muted-foreground/70">
            {data.length} {data.length === 1 ? 'note' : 'notes'}
          </span>
        )}
      </div>

      {canCompose && (
        <form onSubmit={handleSubmit} className="mb-5 space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a note about this employee's performance…"
            rows={3}
            maxLength={8000}
            className="block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors resize-y"
          />
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded border-input"
              />
              <span>Private — only managers/HR can see</span>
            </label>
            <LoadingButton
              type="submit"
              loading={submitting}
              loadingText="Adding…"
              disabled={!body.trim()}
            >
              Add note
            </LoadingButton>
          </div>
          {submitError && <ErrorMessage message={submitError} />}
        </form>
      )}

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}

      {!loading && data && data.length === 0 && (
        <p className="text-sm text-muted-foreground/70">
          No notes yet{canCompose ? ' — be the first to add one.' : '.'}
        </p>
      )}

      {!loading && data && data.length > 0 && (
        <ul className="space-y-3">
          {data.map((note) => (
            <li
              key={note.id}
              className="rounded-md border border-border bg-secondary/30 p-3 text-sm"
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {note.author ? employeeName(note.author) : 'Unknown author'}
                  </span>
                  <span>·</span>
                  <span>{formatDate(note.createdAt)}</span>
                  {note.isPrivate && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                      Private
                    </span>
                  )}
                </div>
                {currentEmployeeId && note.authorId === currentEmployeeId && (
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap text-foreground/90">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
