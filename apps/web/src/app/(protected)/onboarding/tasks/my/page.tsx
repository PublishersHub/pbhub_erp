'use client';

import { useEffect, useMemo } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar } from '@/components/ui/filter-bar';
import { useAsync, useTableParams, sortLocal, paginateLocal } from '@/lib/hooks';
import { getMyTasks } from '@/lib/onboarding-api';
import { formatDate, employeeName } from '@/lib/format';
import { TaskStatusForm } from '@/components/onboarding/task-status-form';

const SORT_OPTIONS = [
  { value: '', label: 'Default order' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'status', label: 'Status' },
  { value: 'title', label: 'Title' },
];

export default function MyTasksPage() {
  useDocumentTitle('My Onboarding Tasks');
  const { page, sort, order, pageSize, setPage, setSort, setParams } =
    useTableParams({ pageSize: 10 });

  const { data, error, loading, refetch } = useAsync(() => getMyTasks());

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'title': return item.title;
          case 'dueDate': return item.dueDate;
          case 'status': return item.status;
          default: return null;
        }
      }),
    [data, sort, order],
  );

  const { items, total, totalPages } = useMemo(
    () => paginateLocal(sorted, page, pageSize),
    [sorted, page, pageSize],
  );

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader title="My Onboarding Tasks" />

      {(data?.length ?? 0) > 0 && (
        <FilterBar>
          <select
            value={sort}
            onChange={(e) => {
              const key = e.target.value;
              if (key) setSort(key);
              else setParams({ sort: null, order: null, page: null });
            }}
            className="rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {sort && (
            <button
              onClick={() =>
                setParams({ order: order === 'asc' ? 'desc' : 'asc', page: null })
              }
              className="rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              {order === 'asc' ? '↑ Ascending' : '↓ Descending'}
            </button>
          )}
        </FilterBar>
      )}

      {total === 0 ? (
        <EmptyState title="No tasks assigned" description="You have no onboarding tasks assigned to you." />
      ) : (
        <>
          <div className="space-y-3">
            {items.map((task) => (
              <div
                key={task.id}
                className={`rounded-lg border p-4 shadow-soft ${
                  task.isOverdue && task.status !== 'COMPLETED'
                    ? 'border-l-2 border-l-destructive border-destructive/30 bg-destructive-soft'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      {task.isRequired && (
                        <span className="rounded bg-primary-soft px-1.5 py-0.5 text-xs font-medium text-primary">Required</span>
                      )}
                      {task.isOverdue && task.status !== 'COMPLETED' && (
                        <span className="rounded bg-destructive-soft px-1.5 py-0.5 text-xs font-medium text-destructive">Overdue</span>
                      )}
                    </div>
                    {task.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>Due: {formatDate(task.dueDate)}</span>
                      <span>Role: {task.assigneeRole.replace(/_/g, ' ')}</span>
                      {task.onboardingInstance?.employee && (
                        <span>
                          New hire:{' '}
                          <Link
                            href={`/onboarding/${task.onboardingInstanceId}`}
                            className="text-primary hover:underline"
                          >
                            {employeeName(task.onboardingInstance.employee)}
                          </Link>
                        </span>
                      )}
                    </div>
                    {task.blockedReason && (
                      <p className="mt-1 text-xs text-warning">Blocked: {task.blockedReason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={task.status} />
                    <TaskStatusForm taskId={task.id} currentStatus={task.status} onUpdated={refetch} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 rounded-lg border border-border bg-card shadow-soft">
              <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
