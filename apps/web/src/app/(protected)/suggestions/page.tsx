'use client';

import Link from 'next/link';
import { useDocumentTitle } from '@/lib/use-document-title';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { useAsync, usePermission } from '@/lib/hooks';
import { listMySuggestions } from '@/lib/suggestions-api';
import { formatDate } from '@/lib/format';
import type { Suggestion, SuggestionCategory } from '@/types/suggestion';

const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  WORKPLACE: 'Workplace',
  PROCESS: 'Process',
  TOOLS: 'Tools',
  CULTURE: 'Culture',
  COMPENSATION: 'Compensation',
  OTHER: 'Other',
};

const CATEGORY_TONE: Record<SuggestionCategory, string> = {
  WORKPLACE: 'bg-info-soft text-info border border-info/20',
  PROCESS: 'bg-primary-soft text-primary border border-primary/20',
  TOOLS: 'bg-warning-soft text-warning border border-warning/20',
  CULTURE: 'bg-success-soft text-success border border-success/20',
  COMPENSATION: 'bg-destructive-soft text-destructive border border-destructive/20',
  OTHER: 'bg-secondary text-secondary-foreground border border-border',
};

function CategoryChip({ category }: { category: SuggestionCategory }) {
  const cls = CATEGORY_TONE[category] ?? CATEGORY_TONE.OTHER;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${cls}`}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}

export default function SuggestionsPage() {
  useDocumentTitle('Suggestions');
  const { can } = usePermission();
  const canManage = can('suggestion.manage');

  const { data, error, errorStatus, loading, refetch } = useAsync(
    () => listMySuggestions(),
    [],
  );

  return (
    <div>
      <PageHeader
        title="Suggestions"
        description="Share ideas to improve the workplace, processes, or tools — anonymously if you prefer."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <Link
                href="/suggestions/inbox"
                className="motion-press rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
              >
                Open Inbox
              </Link>
            )}
            <Link
              href="/suggestions/new"
              className="motion-press rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              New suggestion
            </Link>
          </div>
        }
      />

      {loading && <SkeletonTable rows={4} cols={1} />}

      {error && (
        <ErrorMessage message={error} status={errorStatus} onRetry={refetch} />
      )}

      {data && data.length === 0 && (
        <EmptyState
          variant="default"
          title="No suggestions yet"
          description="Got an idea to make this place better? Share it — named or anonymous."
          cta={{ label: 'Submit your first suggestion', href: '/suggestions/new' }}
        />
      )}

      {data && data.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((s: Suggestion) => (
            <Link
              key={s.id}
              href={`/suggestions/${s.id}`}
              className="block rounded-lg border border-border bg-card p-5 shadow-soft transition-colors hover:bg-muted/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-foreground">
                    {s.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Submitted {formatDate(s.createdAt)}
                  </p>
                </div>
                <StatusBadge status={s.status} />
              </div>

              <p className="mt-3 line-clamp-2 text-sm text-foreground/80">
                {s.body}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <CategoryChip category={s.category} />
                {s.responseBody && (
                  <span className="inline-flex items-center rounded-full border border-success/30 bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
                    Response received
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
