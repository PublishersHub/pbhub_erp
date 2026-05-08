'use client';

import { useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { useAuth } from '@/context/auth-context';
import {
  getTask,
  updateTask,
  completeTask,
  deleteTask,
} from '@/lib/tasks-api';
import { formatDate, formatDateTime, employeeName } from '@/lib/format';
import type { TaskPriority, TaskStatus } from '@/types/task';

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

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

export default function TaskDetailPage() {
  useDocumentTitle('Task');
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { can } = usePermission();
  const toast = useToast();
  const confirm = useConfirm();

  const { data: task, error, errorStatus, loading, refetch } = useAsync(
    () => getTask(id),
    [id],
  );

  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('MEDIUM');

  const canDelete = can('task.delete');
  const canReadAll = can('task.read');

  if (loading) {
    return (
      <div>
        <PageHeader title="Task" backHref="/tasks" />
        <Loading />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div>
        <PageHeader title="Task" backHref="/tasks" />
        <ErrorMessage
          message={error ?? 'Task not found'}
          status={errorStatus}
          onRetry={refetch}
        />
      </div>
    );
  }

  const currentUserId = user?.user?.id;
  const isAssignee = !!currentUserId && task.assignee?.userId === currentUserId;
  const isCreator = !!currentUserId && task.assignedBy?.userId === currentUserId;
  const isAdmin = canReadAll || canDelete;

  const canEditAll = isCreator || isAdmin;
  const canChangeStatus = isAssignee || isCreator || isAdmin;
  const isTerminal = task.status === 'COMPLETED' || task.status === 'CANCELLED';

  function startEdit() {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description ?? '');
    setEditDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
    setEditPriority(task.priority);
    setEditing(true);
    setActionError('');
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (acting) return;
    setActing(true);
    setActionError('');
    try {
      await updateTask(id, {
        title: editTitle.trim(),
        description: editDescription.trim() ? editDescription.trim() : undefined,
        dueDate: editDueDate ? editDueDate : undefined,
        priority: editPriority,
      });
      toast.success('Task updated');
      setEditing(false);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setActing(false);
    }
  }

  async function handleStatusChange(next: TaskStatus) {
    if (acting || !task || task.status === next) return;
    setActing(true);
    setActionError('');
    try {
      await updateTask(id, { status: next });
      toast.success(`Status set to ${next.replace('_', ' ')}`);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActing(false);
    }
  }

  async function handleMarkComplete() {
    if (acting) return;
    const ok = await confirm({
      title: 'Mark task as complete?',
      description: 'This will set the status to COMPLETED.',
      confirmLabel: 'Mark complete',
      cancelLabel: 'Not yet',
      tone: 'default',
    });
    if (!ok) return;
    setActing(true);
    setActionError('');
    try {
      await completeTask(id);
      toast.success('Task completed', 'Nice work.');
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to complete task');
    } finally {
      setActing(false);
    }
  }

  async function handleDelete() {
    if (acting) return;
    const ok = await confirm({
      title: 'Delete this task?',
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      tone: 'danger',
    });
    if (!ok) return;
    setActing(true);
    setActionError('');
    try {
      await deleteTask(id);
      toast.success('Task deleted');
      router.push('/tasks');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete task');
      setActing(false);
    }
  }

  const inputCls =
    'mt-1 block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';
  const labelCls = 'block text-sm font-medium text-foreground/80';

  return (
    <div>
      <PageHeader
        title={task.title}
        backHref="/tasks"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!editing && canEditAll && !isTerminal && (
              <button
                type="button"
                onClick={startEdit}
                className="motion-press rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={acting}
                className="motion-press rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
              >
                Delete
              </button>
            )}
          </div>
        }
      />

      {actionError && (
        <div className="mb-4">
          <ErrorMessage message={actionError} />
        </div>
      )}

      {editing && canEditAll ? (
        <form
          onSubmit={saveEdit}
          className="mb-6 max-w-2xl space-y-5 rounded-lg border border-border bg-card p-6 shadow-soft"
        >
          <div>
            <label className={labelCls}>Title *</label>
            <input
              type="text"
              required
              maxLength={200}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              rows={4}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Due Date</label>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                className={inputCls}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <LoadingButton type="submit" loading={acting} loadingText="Saving…">
              Save
            </LoadingButton>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="motion-press rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <StatusBadge status={task.status} />
                <PriorityChip priority={task.priority} />
                {task.dueDate && (
                  <span className="text-xs text-muted-foreground">
                    Due {formatDate(task.dueDate)}
                  </span>
                )}
              </div>
              {task.description ? (
                <p className="whitespace-pre-wrap text-sm text-foreground/90">
                  {task.description}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  No description provided.
                </p>
              )}
            </div>

            {/* Status actions */}
            {canChangeStatus && (
              <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Update status
                </h3>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleStatusChange(s)}
                      disabled={acting || task.status === s}
                      className={`motion-press rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        task.status === s
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card text-foreground/80 hover:bg-muted'
                      }`}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                {!isTerminal && (
                  <div className="mt-4">
                    <LoadingButton
                      type="button"
                      loading={acting}
                      loadingText="Working…"
                      onClick={handleMarkComplete}
                    >
                      Mark Complete
                    </LoadingButton>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Details
              </h3>
              <dl className="space-y-1">
                <DetailRow label="Assignee">
                  {employeeName(task.assignee)}
                  {task.assignee?.employeeCode && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({task.assignee.employeeCode})
                    </span>
                  )}
                </DetailRow>
                <DetailRow label="Assigned by">
                  {employeeName(task.assignedBy)}
                </DetailRow>
                <DetailRow label="Due date">
                  {task.dueDate ? formatDate(task.dueDate) : '—'}
                </DetailRow>
                <DetailRow label="Priority">
                  <PriorityChip priority={task.priority} />
                </DetailRow>
                <DetailRow label="Status">
                  <StatusBadge status={task.status} />
                </DetailRow>
                <DetailRow label="Created">
                  {formatDateTime(task.createdAt)}
                </DetailRow>
                {task.completedAt && (
                  <DetailRow label="Completed">
                    {formatDateTime(task.completedAt)}
                  </DetailRow>
                )}
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
