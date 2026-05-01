'use client';

import { useState } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { ErrorMessage } from '@/components/ui/error-message';
import { updateTaskStatus } from '@/lib/onboarding-api';
import type { OnboardingTaskStatus } from '@/types/onboarding';

const STATUS_OPTIONS: { value: OnboardingTaskStatus; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'COMPLETED', label: 'Completed' },
];

interface TaskStatusFormProps {
  taskId: string;
  currentStatus: OnboardingTaskStatus;
  onUpdated: () => void;
}

export function TaskStatusForm({ taskId, currentStatus, onUpdated }: TaskStatusFormProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<OnboardingTaskStatus>(currentStatus);
  const [blockedReason, setBlockedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');

  if (currentStatus === 'COMPLETED') {
    return <StatusBadge status="COMPLETED" />;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-primary hover:text-primary/80 font-medium"
      >
        Update
      </button>
    );
  }

  async function handleSubmit() {
    if (status === 'BLOCKED' && !blockedReason.trim()) {
      setError('Blocked reason is required');
      return;
    }
    setError('');
    setActing(true);
    try {
      await updateTaskStatus(taskId, {
        status,
        ...(status === 'BLOCKED' && blockedReason.trim() && { blockedReason: blockedReason.trim() }),
        ...(notes.trim() && { notes: notes.trim() }),
      });
      setOpen(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="rounded-md border border-info-soft bg-info-soft/50 p-3 space-y-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as OnboardingTaskStatus)}
        className="block w-full rounded-md border border-input bg-card px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
      >
        {STATUS_OPTIONS.filter((o) => o.value !== currentStatus).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {status === 'BLOCKED' && (
        <textarea
          placeholder="Blocked reason *"
          value={blockedReason}
          onChange={(e) => setBlockedReason(e.target.value)}
          rows={2}
          className="block w-full rounded-md border border-input bg-card px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
        />
      )}
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={1}
        className="block w-full rounded-md border border-input bg-card px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          disabled={acting}
          onClick={handleSubmit}
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {acting ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => { setOpen(false); setError(''); }}
          className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
        >
          Cancel
        </button>
      </div>
      {error && <ErrorMessage message={error} />}
    </div>
  );
}
