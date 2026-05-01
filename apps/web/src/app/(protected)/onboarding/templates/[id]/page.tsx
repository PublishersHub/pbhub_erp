'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { useAsync, usePermission } from '@/lib/hooks';
import {
  getTemplate,
  updateTemplate,
  addTemplateTask,
  updateTemplateTask,
  removeTemplateTask,
  reorderTemplateTasks,
} from '@/lib/onboarding-api';
import { formatDate } from '@/lib/format';
import type { OnboardingTaskAssigneeRole } from '@/types/onboarding';

const ASSIGNEE_ROLES: Exclude<OnboardingTaskAssigneeRole, 'CUSTOM'>[] = ['NEW_HIRE', 'MANAGER', 'HR', 'IT'];

export default function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermission();
  const canManage = can('onboarding.template.manage');
  const { data: tpl, error, loading, refetch } = useAsync(() => getTemplate(id), [id]);
  const [actionError, setActionError] = useState('');
  const [acting, setActing] = useState(false);

  // Template edit
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [tplDefault, setTplDefault] = useState(false);
  const [tplActive, setTplActive] = useState(true);

  // Add task form
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newRole, setNewRole] = useState<Exclude<OnboardingTaskAssigneeRole, 'CUSTOM'>>('NEW_HIRE');
  const [newOffset, setNewOffset] = useState(0);
  const [newRequired, setNewRequired] = useState(true);
  const [newAllowDoc, setNewAllowDoc] = useState(false);

  // Edit task inline
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editRole, setEditRole] = useState<Exclude<OnboardingTaskAssigneeRole, 'CUSTOM'>>('NEW_HIRE');
  const [editOffset, setEditOffset] = useState(0);
  const [editRequired, setEditRequired] = useState(true);
  const [editAllowDoc, setEditAllowDoc] = useState(false);

  function startEditTemplate() {
    if (!tpl) return;
    setTplName(tpl.name);
    setTplDesc(tpl.description || '');
    setTplDefault(tpl.isDefault);
    setTplActive(tpl.isActive);
    setEditingTemplate(true);
  }

  async function handleUpdateTemplate() {
    setActionError('');
    setActing(true);
    try {
      await updateTemplate(id, {
        name: tplName.trim(),
        description: tplDesc.trim() || undefined,
        isDefault: tplDefault,
        isActive: tplActive,
      });
      setEditingTemplate(false);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setActing(false);
    }
  }

  async function handleAddTask() {
    if (!newTitle.trim()) return;
    const tasks = tpl?.tasks ?? [];
    const nextSort = tasks.length > 0 ? Math.max(...tasks.map((t) => t.sortOrder)) + 1 : 0;
    setActionError('');
    setActing(true);
    try {
      await addTemplateTask(id, {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        assigneeRole: newRole,
        offsetDays: newOffset,
        sortOrder: nextSort,
        isRequired: newRequired,
        allowDocument: newAllowDoc,
      });
      setShowAddTask(false);
      setNewTitle('');
      setNewDesc('');
      setNewRole('NEW_HIRE');
      setNewOffset(0);
      setNewRequired(true);
      setNewAllowDoc(false);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add task');
    } finally {
      setActing(false);
    }
  }

  function startEditTask(task: { id: string; title: string; description: string | null; assigneeRole: OnboardingTaskAssigneeRole; offsetDays: number; isRequired: boolean; allowDocument: boolean }) {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setEditRole(task.assigneeRole as Exclude<OnboardingTaskAssigneeRole, 'CUSTOM'>);
    setEditOffset(task.offsetDays);
    setEditRequired(task.isRequired);
    setEditAllowDoc(task.allowDocument);
  }

  async function handleUpdateTask() {
    if (!editingTaskId || !editTitle.trim()) return;
    setActionError('');
    setActing(true);
    try {
      await updateTemplateTask(id, editingTaskId, {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        assigneeRole: editRole,
        offsetDays: editOffset,
        isRequired: editRequired,
        allowDocument: editAllowDoc,
      });
      setEditingTaskId(null);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setActing(false);
    }
  }

  async function handleRemoveTask(taskId: string) {
    setActionError('');
    setActing(true);
    try {
      await removeTemplateTask(id, taskId);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setActing(false);
    }
  }

  async function handleMoveTask(taskId: string, direction: 'up' | 'down') {
    const tasks = [...(tpl?.tasks ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= tasks.length) return;

    const newOrder = tasks.map((t, i) => {
      if (i === idx) return { taskId: t.id, sortOrder: tasks[swapIdx].sortOrder };
      if (i === swapIdx) return { taskId: t.id, sortOrder: tasks[idx].sortOrder };
      return { taskId: t.id, sortOrder: t.sortOrder };
    });

    setActionError('');
    setActing(true);
    try {
      await reorderTemplateTasks(id, { order: newOrder });
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Reorder failed');
    } finally {
      setActing(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!tpl) return null;

  const tasks = [...(tpl.tasks ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <PageHeader
        title={tpl.name}
        backHref="/onboarding/templates"
        actions={
          <div className="flex items-center gap-2">
            {tpl.isDefault && (
              <span className="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">Default</span>
            )}
            {tpl.isActive ? (
              <span className="inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">Active</span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">Inactive</span>
            )}
            {canManage && (
              <button
                onClick={startEditTemplate}
                className="rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Edit
              </button>
            )}
          </div>
        }
      />

      {/* Template edit form */}
      {editingTemplate && (
        <div className="mb-6 rounded-lg border border-info-soft bg-info-soft/50 p-4 space-y-3">
          <input
            value={tplName}
            onChange={(e) => setTplName(e.target.value)}
            placeholder="Template name"
            className="block w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <textarea
            value={tplDesc}
            onChange={(e) => setTplDesc(e.target.value)}
            placeholder="Description"
            rows={2}
            className="block w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={tplDefault} onChange={(e) => setTplDefault(e.target.checked)} className="h-4 w-4 rounded border-input text-primary" />
              Default
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={tplActive} onChange={(e) => setTplActive(e.target.checked)} className="h-4 w-4 rounded border-input text-primary" />
              Active
            </label>
          </div>
          <div className="flex gap-2">
            <button disabled={acting} onClick={handleUpdateTemplate} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {acting ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setEditingTemplate(false)} className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template details */}
      <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-soft">
        <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Details</h3>
        <dl>
          {tpl.description && <DetailRow label="Description">{tpl.description}</DetailRow>}
          <DetailRow label="Tasks">{tasks.length}</DetailRow>
          <DetailRow label="Created">{formatDate(tpl.createdAt)}</DetailRow>
        </dl>
      </div>

      {/* Tasks section */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Template Tasks ({tasks.length})</h3>
          {canManage && !showAddTask && (
            <button
              onClick={() => setShowAddTask(true)}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Add Task
            </button>
          )}
        </div>

        {actionError && <div className="mb-3"><ErrorMessage message={actionError} /></div>}

        {/* Add task form */}
        {showAddTask && (
          <div className="mb-4 rounded-md border border-info-soft bg-info-soft/50 p-4 space-y-3">
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Task title *" className="block w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description" rows={2} className="block w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Assignee Role</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value as typeof newRole)} className="block w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none">
                  {ASSIGNEE_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Offset Days</label>
                <input type="number" value={newOffset} onChange={(e) => setNewOffset(parseInt(e.target.value) || 0)} className="block w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} className="h-4 w-4 rounded border-input text-primary" />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={newAllowDoc} onChange={(e) => setNewAllowDoc(e.target.checked)} className="h-4 w-4 rounded border-input text-primary" />
                Allow Document
              </label>
            </div>
            <div className="flex gap-2">
              <button disabled={acting || !newTitle.trim()} onClick={handleAddTask} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {acting ? 'Adding...' : 'Add Task'}
              </button>
              <button onClick={() => setShowAddTask(false)} className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Task list */}
        {tasks.length === 0 ? (
          <EmptyState title="No tasks" description="Add tasks to this template to define the onboarding checklist." />
        ) : (
          <div className="space-y-2">
            {tasks.map((task, idx) => (
              <div key={task.id} className="rounded-md border border-border p-3">
                {editingTaskId === task.id ? (
                  <div className="space-y-2">
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title *" className="block w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none" />
                    <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" rows={2} className="block w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <select value={editRole} onChange={(e) => setEditRole(e.target.value as typeof editRole)} className="rounded-md border border-input bg-card px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none">
                        {ASSIGNEE_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                      </select>
                      <input type="number" value={editOffset} onChange={(e) => setEditOffset(parseInt(e.target.value) || 0)} placeholder="Offset days" className="rounded-md border border-input bg-card px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none" />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs text-foreground">
                        <input type="checkbox" checked={editRequired} onChange={(e) => setEditRequired(e.target.checked)} className="h-3.5 w-3.5 rounded border-input text-primary" />
                        Required
                      </label>
                      <label className="flex items-center gap-2 text-xs text-foreground">
                        <input type="checkbox" checked={editAllowDoc} onChange={(e) => setEditAllowDoc(e.target.checked)} className="h-3.5 w-3.5 rounded border-input text-primary" />
                        Allow Doc
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button disabled={acting} onClick={handleUpdateTask} className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                        {acting ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setEditingTaskId(null)} className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground/70 font-mono">#{task.sortOrder}</span>
                        <p className="text-sm font-medium text-foreground">{task.title}</p>
                        {task.isRequired && <span className="rounded bg-primary-soft px-1.5 py-0.5 text-xs font-medium text-primary">Required</span>}
                        {task.allowDocument && <span className="rounded bg-info-soft px-1.5 py-0.5 text-xs font-medium text-info">Doc</span>}
                      </div>
                      {task.description && <p className="mt-0.5 text-xs text-muted-foreground">{task.description}</p>}
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Role: {task.assigneeRole.replace(/_/g, ' ')}</span>
                        <span>Offset: {task.offsetDays >= 0 ? `Day +${task.offsetDays}` : `Day ${task.offsetDays}`}</span>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          disabled={acting || idx === 0}
                          onClick={() => handleMoveTask(task.id, 'up')}
                          className="rounded p-1 text-xs text-muted-foreground hover:text-foreground/80 disabled:opacity-30"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          disabled={acting || idx === tasks.length - 1}
                          onClick={() => handleMoveTask(task.id, 'down')}
                          className="rounded p-1 text-xs text-muted-foreground hover:text-foreground/80 disabled:opacity-30"
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => startEditTask(task)}
                          className="rounded p-1 text-xs text-primary hover:text-primary/80"
                        >
                          Edit
                        </button>
                        <button
                          disabled={acting}
                          onClick={() => handleRemoveTask(task.id)}
                          className="rounded p-1 text-xs text-destructive hover:text-destructive/80 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
