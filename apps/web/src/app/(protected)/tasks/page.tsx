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
import { useAsync, usePermission } from '@/lib/hooks';
import { listMyTasks, listAllTasks } from '@/lib/tasks-api';
import { formatDate, employeeName } from '@/lib/format';
import type { Task, TaskStatus } from '@/types/task';

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

type ViewMode = 'mine' | 'created' | 'all';

const PRIORITY_TONE: Record<string, string> = {
  URGENT: 'bg-destructive-soft text-destructive border border-destructive/20',
  HIGH: 'bg-warning-soft text-warning border border-warning/20',
  MEDIUM: 'bg-info-soft text-info border border-info/20',
  LOW: 'bg-secondary text-secondary-foreground border border-border',
};

function PriorityChip({ priority }: { priority: string }) {
  const cls = PRIORITY_TONE[priority] ?? PRIORITY_TONE.MEDIUM;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${cls}`}
    >
      {priority}
    </span>
  );
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return false;
  const due = new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export default function TasksPage() {
  useDocumentTitle('Tasks');
  const { can } = usePermission();

  const canCreate = can('task.create');
  const canReadAll = can('task.read');

  const [view, setView] = useState<ViewMode>('mine');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [search, setSearch] = useState('');

  const { data, error, errorStatus, loading, refetch } = useAsync(() => {
    const statusFilter = status || undefined;
    if (view === 'all' && canReadAll) {
      return listAllTasks({ status: statusFilter });
    }
    if (view === 'created' && canCreate) {
      return listMyTasks({ status: statusFilter, role: 'creator' });
    }
    return listMyTasks({ status: statusFilter, role: 'assignee' });
  }, [view, status, canReadAll, canCreate]);

  const filtered = useMemo<Task[]>(() => {
    let arr = data ?? [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((t) => {
        const title = t.title.toLowerCase();
        const desc = (t.description ?? '').toLowerCase();
        const assignee = t.assignee
          ? `${t.assignee.firstName} ${t.assignee.lastName}`.toLowerCase()
          : '';
        const assigner = t.assignedBy
          ? `${t.assignedBy.firstName} ${t.assignedBy.lastName}`.toLowerCase()
          : '';
        return (
          title.includes(q) ||
          desc.includes(q) ||
          assignee.includes(q) ||
          assigner.includes(q)
        );
      });
    }
    return arr;
  }, [data, search]);

  const hasActiveFilters = !!(status || view !== 'mine' || search);

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Track and manage tasks assigned to you and your team."
        actions={
          canCreate ? (
            <Link
              href="/tasks/new"
              className="motion-press rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              New Task
            </Link>
          ) : undefined
        }
      />

      <FilterBar
        onClear={() => {
          setView('mine');
          setStatus('');
          setSearch('');
        }}
        hasActiveFilters={hasActiveFilters}
      >
        <select
          value={view}
          onChange={(e) => setView(e.target.value as ViewMode)}
          className="rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
        >
          <option value="mine">My tasks</option>
          {canCreate && <option value="created">Assigned by me</option>}
          {canReadAll && <option value="all">All tasks</option>}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatus | '')}
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
          placeholder="Search title, description, person…"
          className="min-w-[14rem] flex-1"
        />
      </FilterBar>

      {loading && <SkeletonTable rows={6} cols={6} />}
      {error && (
        <ErrorMessage
          message={error}
          status={errorStatus}
          onRetry={refetch}
        />
      )}
      {data && filtered.length === 0 && (
        <EmptyState
          variant="default"
          title="No tasks here"
          description={
            view === 'mine'
              ? 'You have no tasks matching the current filters.'
              : view === 'created'
              ? "You haven't assigned any tasks yet."
              : 'No tasks found in your organization.'
          }
          cta={
            canCreate
              ? { label: 'Assign a new task', href: '/tasks/new' }
              : undefined
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
                    {view !== 'mine' && (
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                        Assignee
                      </th>
                    )}
                    {view !== 'created' && (
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                        Assigned by
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Due
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((task) => {
                    const overdue = isOverdue(task);
                    return (
                      <tr key={task.id} className="group transition-colors hover:bg-muted/50">
                        <td className="px-4 py-3 text-sm">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {task.title}
                          </Link>
                          {task.description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {task.description}
                            </p>
                          )}
                        </td>
                        {view !== 'mine' && (
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                            {employeeName(task.assignee)}
                          </td>
                        )}
                        {view !== 'created' && (
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                            {employeeName(task.assignedBy)}
                          </td>
                        )}
                        <td className={`whitespace-nowrap px-4 py-3 text-sm ${overdue ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
                          {task.dueDate ? formatDate(task.dueDate) : '—'}
                          {overdue && (
                            <span className="ml-1 text-[10px] font-medium uppercase text-destructive">
                              overdue
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <PriorityChip priority={task.priority} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="inline-flex h-7 items-center gap-1 rounded-lg bg-secondary px-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 motion-press"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="block space-y-3 md:hidden">
            {filtered.map((task) => {
              const overdue = isOverdue(task);
              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="block rounded-lg border border-border bg-card p-4 shadow-soft transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <PriorityChip priority={task.priority} />
                    {task.dueDate && (
                      <span
                        className={`text-xs ${overdue ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}
                      >
                        Due {formatDate(task.dueDate)}
                        {overdue && ' · overdue'}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    {view !== 'mine' && task.assignee && (
                      <span>To: {employeeName(task.assignee)}</span>
                    )}
                    {view !== 'created' && task.assignedBy && (
                      <span>From: {employeeName(task.assignedBy)}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
