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
        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
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
    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as OnboardingTaskStatus)}
        className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
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
          className="block w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
        />
      )}
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={1}
        className="block w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          disabled={acting}
          onClick={handleSubmit}
          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {acting ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => { setOpen(false); setError(''); }}
          className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
      {error && <ErrorMessage message={error} />}
    </div>
  );
}
