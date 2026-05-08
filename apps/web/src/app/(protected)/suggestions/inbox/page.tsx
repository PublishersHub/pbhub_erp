'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useDocumentTitle } from '@/lib/use-document-title';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { TableSearch } from '@/components/ui/table-search';
import { FilterBar } from '@/components/ui/filter-bar';
import { useAsync } from '@/lib/hooks';
import { listAllSuggestions } from '@/lib/suggestions-api';
import { formatDate, employeeName } from '@/lib/format';
import type {
  Suggestion,
  SuggestionCategory,
  SuggestionStatus,
} from '@/types/suggestion';

const STATUSES: SuggestionStatus[] = [
  'OPEN',
  'IN_REVIEW',
  'IMPLEMENTED',
  'DECLINED',
  'ARCHIVED',
];

const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  WORKPLACE: 'Workplace',
  PROCESS: 'Process',
  TOOLS: 'Tools',
  CULTURE: 'Culture',
  COMPENSATION: 'Compensation',
  OTHER: 'Other',
};

function authorLabel(s: Suggestion): string {
  if (s.isAnonymous || !s.author) return 'Anonymous';
  return employeeName(s.author);
}

export default function SuggestionsInboxPage() {
  useDocumentTitle('Suggestions Inbox');

  const [status, setStatus] = useState<SuggestionStatus | ''>('');
  const [search, setSearch] = useState('');

  const { data, error, errorStatus, loading, refetch } = useAsync(
    () => listAllSuggestions({ status: status || undefined }),
    [status],
  );

  const filtered = useMemo<Suggestion[]>(() => {
    let arr = data ?? [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((s) => {
        const title = s.title.toLowerCase();
        const body = s.body.toLowerCase();
        const author = s.author
          ? `${s.author.firstName} ${s.author.lastName}`.toLowerCase()
          : '';
        return title.includes(q) || body.includes(q) || author.includes(q);
      });
    }
    return arr;
  }, [data, search]);

  const hasActiveFilters = !!(status || search);

  return (
    <div>
      <PageHeader
        title="Suggestions Inbox"
        description="Review and respond to employee suggestions across the organization."
        backHref="/suggestions"
      />

      <FilterBar
        onClear={() => {
          setStatus('');
          setSearch('');
        }}
        hasActiveFilters={hasActiveFilters}
      >
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as SuggestionStatus | '')}
          className="rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search title, body, author…"
          className="min-w-[14rem] flex-1"
        />
      </FilterBar>

      {loading && <SkeletonTable rows={6} cols={5} />}

      {error && (
        <ErrorMessage message={error} status={errorStatus} onRetry={refetch} />
      )}

      {data && filtered.length === 0 && (
        <EmptyState
          variant="inbox"
          title="Nothing in the inbox"
          description={
            hasActiveFilters
              ? 'No suggestions match the current filters.'
              : 'No suggestions have been submitted yet.'
          }
        />
      )}

      {data && filtered.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-soft md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      From
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Submitted
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="group transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/suggestions/${s.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {s.title}
                        </Link>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {s.body}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {s.isAnonymous ? (
                          <span className="italic text-muted-foreground">
                            Anonymous
                          </span>
                        ) : (
                          <span className="text-foreground">
                            {authorLabel(s)}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground/80">
                        {CATEGORY_LABELS[s.category]}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(s.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Link
                          href={`/suggestions/${s.id}`}
                          className="motion-press inline-flex h-7 items-center gap-1 rounded-lg bg-secondary px-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="block space-y-3 md:hidden">
            {filtered.map((s) => (
              <Link
                key={s.id}
                href={`/suggestions/${s.id}`}
                className="block rounded-lg border border-border bg-card p-4 shadow-soft transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {s.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {s.body}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span>From: {authorLabel(s)}</span>
                  <span>{CATEGORY_LABELS[s.category]}</span>
                  <span>{formatDate(s.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
