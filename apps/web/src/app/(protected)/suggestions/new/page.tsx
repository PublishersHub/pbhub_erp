'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useDocumentTitle } from '@/lib/use-document-title';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { LoadingButton } from '@/components/ui/loading-button';
import { useToast } from '@/components/toast';
import { createSuggestion } from '@/lib/suggestions-api';
import type { SuggestionCategory } from '@/types/suggestion';

const CATEGORIES: { value: SuggestionCategory; label: string }[] = [
  { value: 'WORKPLACE', label: 'Workplace' },
  { value: 'PROCESS', label: 'Process' },
  { value: 'TOOLS', label: 'Tools' },
  { value: 'CULTURE', label: 'Culture' },
  { value: 'COMPENSATION', label: 'Compensation' },
  { value: 'OTHER', label: 'Other' },
];

export default function NewSuggestionPage() {
  useDocumentTitle('New Suggestion');
  const router = useRouter();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<SuggestionCategory>('OTHER');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!body.trim()) {
      setError('Please describe your suggestion');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createSuggestion({
        title: title.trim(),
        body: body.trim(),
        category,
        isAnonymous,
      });
      toast.success('Suggestion submitted');
      // Anonymous suggestions can't be retrieved on the my-list, so send the
      // user back to the list page to keep things tidy.
      if (isAnonymous) {
        router.push('/suggestions');
      } else {
        router.push(`/suggestions/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit suggestion');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    'mt-1 block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';
  const labelCls = 'block text-sm font-medium text-foreground/80';

  return (
    <div>
      <PageHeader title="New suggestion" backHref="/suggestions" />

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-5 rounded-lg border border-border bg-card p-6 shadow-soft"
      >
        <div>
          <label className={labelCls}>Title *</label>
          <input
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
            placeholder="A short headline for your idea"
          />
        </div>

        <div>
          <label className={labelCls}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SuggestionCategory)}
            className={inputCls}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Details *</label>
          <textarea
            required
            rows={6}
            maxLength={5000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={inputCls}
            placeholder="What's the idea? What problem does it solve?"
          />
        </div>

        <label className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-3">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring/50"
          />
          <div className="text-sm">
            <span className="font-medium text-foreground">Submit anonymously</span>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your name will not be attached to this suggestion. HR / admins
              will see only the content. You will not be able to track this
              suggestion in your personal list afterwards.
            </p>
          </div>
        </label>

        {isAnonymous && (
          <div className="rounded-md border border-info/20 bg-info-soft p-3 text-sm text-info">
            Heads up: anonymous suggestions cannot receive a personal
            notification when responded to, since we do not store any link back
            to you.
          </div>
        )}

        {error && <ErrorMessage message={error} />}

        <div className="flex gap-3">
          <LoadingButton type="submit" loading={submitting} loadingText="Submitting…">
            Submit suggestion
          </LoadingButton>
          <button
            type="button"
            onClick={() => router.back()}
            className="motion-press rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
