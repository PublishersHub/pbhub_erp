'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useDocumentTitle } from '@/lib/use-document-title';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { Loading } from '@/components/ui/loading';
import { LoadingButton } from '@/components/ui/loading-button';
import { useAsync } from '@/lib/hooks';
import { listEmployees } from '@/lib/employee-api';
import { createTask } from '@/lib/tasks-api';
import type { TaskPriority } from '@/types/task';

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function NewTaskPage() {
  useDocumentTitle('New Task');
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: employees, loading: empLoading } = useAsync(
    () => listEmployees({ isActive: 'true' }),
    [],
  );

  const sortedEmployees = useMemo(
    () =>
      [...(employees ?? [])].sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
      ),
    [employees],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!assigneeId) {
      setError('Please select an assignee');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createTask({
        title: title.trim(),
        ...(description.trim() && { description: description.trim() }),
        assigneeId,
        ...(dueDate && { dueDate }),
        priority,
      });
      router.push(`/tasks/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    'mt-1 block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';
  const labelCls = 'block text-sm font-medium text-foreground/80';

  if (empLoading) {
    return (
      <div>
        <PageHeader title="New Task" backHref="/tasks" />
        <Loading />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="New Task" backHref="/tasks" />

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
            placeholder="What needs to get done?"
          />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputCls}
            placeholder="Optional details, links, or context"
          />
        </div>

        <div>
          <label className={labelCls}>Assignee *</label>
          <select
            required
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className={inputCls}
          >
            <option value="">Select an employee...</option>
            {sortedEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
                {emp.employeeCode ? ` (${emp.employeeCode})` : ''}
              </option>
            ))}
          </select>
          {sortedEmployees.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              No active employees found.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
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

        {error && <ErrorMessage message={error} />}

        <div className="flex gap-3">
          <LoadingButton
            type="submit"
            loading={submitting}
            loadingText="Creating…"
          >
            Create Task
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
