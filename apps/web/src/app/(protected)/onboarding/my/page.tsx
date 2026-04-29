'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { useAsync, usePermission } from '@/lib/hooks';
import { getMyInstance } from '@/lib/onboarding-api';
import { formatDate, employeeName } from '@/lib/format';
import { TaskStatusForm } from '@/components/onboarding/task-status-form';
import { DocumentUpload } from '@/components/onboarding/document-upload';

export default function MyOnboardingPage() {
  const { can } = usePermission();
  const { data: inst, error, loading, refetch } = useAsync(() => getMyInstance());

  if (loading) return <Loading />;

  if (error) {
    if (error.includes('not found') || error.includes('404')) {
      return (
        <div>
          <PageHeader title="My Onboarding" />
          <EmptyState title="No onboarding found" description="You don't have an onboarding instance yet." />
        </div>
      );
    }
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  if (!inst) return null;

  const tasks = inst.tasks ?? [];
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;

  return (
    <div>
      <PageHeader
        title="My Onboarding"
        actions={<StatusBadge status={inst.status} />}
      />

      <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Details</h3>
        <dl>
          <DetailRow label="Template">{inst.templateName}</DetailRow>
          <DetailRow label="Joining Date">{formatDate(inst.joiningDate)}</DetailRow>
          <DetailRow label="Progress">{completed}/{tasks.length} tasks completed</DetailRow>
          {inst.startedAt && <DetailRow label="Started">{formatDate(inst.startedAt)}</DetailRow>}
          {inst.completedAt && <DetailRow label="Completed">{formatDate(inst.completedAt)}</DetailRow>}
        </dl>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Tasks</h3>
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-500">No tasks assigned yet.</p>
        ) : (
          <div className="space-y-3">
            {tasks.sort((a, b) => a.sortOrder - b.sortOrder).map((task) => (
              <div
                key={task.id}
                className={`rounded-md border p-4 ${
                  task.isOverdue && task.status !== 'COMPLETED'
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      {task.isRequired && (
                        <span className="text-xs text-red-500">Required</span>
                      )}
                      {task.isOverdue && task.status !== 'COMPLETED' && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">Overdue</span>
                      )}
                    </div>
                    {task.description && (
                      <p className="mt-1 text-xs text-gray-500">{task.description}</p>
                    )}
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                      <span>Due: {formatDate(task.dueDate)}</span>
                      <span>Assigned to: {task.assigneeRole.replace(/_/g, ' ')}</span>
                      {task.assigneeEmployee && <span>({employeeName(task.assigneeEmployee)})</span>}
                    </div>
                    {task.blockedReason && (
                      <p className="mt-1 text-xs text-orange-600">Blocked: {task.blockedReason}</p>
                    )}
                    {task.notes && (
                      <p className="mt-1 text-xs text-gray-400">Notes: {task.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={task.status} />
                    {can('onboarding.task.update') && inst.status !== 'CANCELLED' && inst.status !== 'COMPLETED' && (
                      <TaskStatusForm taskId={task.id} currentStatus={task.status} onUpdated={refetch} />
                    )}
                  </div>
                </div>
                {task.allowDocument && (
                  <div className="mt-2 border-t border-gray-100 pt-2">
                    <DocumentUpload
                      taskId={task.id}
                      documents={task.documents ?? []}
                      canUpload={can('onboarding.task.update') && task.status !== 'COMPLETED'}
                      canDelete={can('onboarding.instance.manage')}
                      onChanged={refetch}
                    />
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
