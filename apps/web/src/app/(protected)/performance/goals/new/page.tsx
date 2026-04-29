'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { useAsync } from '@/lib/hooks';
import { listPerformanceCycles, createGoal } from '@/lib/performance-api';
import type { GoalMeasurementType } from '@/types/performance';

export default function NewGoalPage() {
  const router = useRouter();
  const { data: cycles } = useAsync(() => listPerformanceCycles(), []);

  const [cycleId, setCycleId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [measurementType, setMeasurementType] = useState<GoalMeasurementType>('PERCENTAGE');
  const [targetValue, setTargetValue] = useState('');
  const [weight, setWeight] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setSubmitting(true);
    try {
      await createGoal({
        cycleId,
        title: title.trim(),
        ...(description.trim() && { description: description.trim() }),
        ...(employeeId.trim() && { employeeId: employeeId.trim() }),
        measurementType,
        ...(targetValue && { targetValue: parseFloat(targetValue) }),
        weight: parseFloat(weight),
      });
      router.push('/performance/goals');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create');
      setSubmitting(false);
    }
  }

  const inputCls =
    'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-700';

  // Filter to cycles that are in GOAL_SETTING or DRAFT status for creating goals
  const availableCycles = (cycles ?? []).filter((c) =>
    ['DRAFT', 'GOAL_SETTING', 'ACTIVE'].includes(c.status),
  );

  return (
    <div>
      <PageHeader title="Create Goal" backHref="/performance/goals" />

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4 rounded-lg border bg-white p-6 shadow-sm">
        <div>
          <label className={labelCls}>Cycle *</label>
          <select required value={cycleId} onChange={(e) => setCycleId(e.target.value)} className={inputCls}>
            <option value="">Select a cycle</option>
            {availableCycles.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.status.replace(/_/g, ' ')})</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Title *</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Increase customer retention by 15%" />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} placeholder="Describe the goal, success criteria, etc." />
        </div>

        <div>
          <label className={labelCls}>Employee ID (optional)</label>
          <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputCls} placeholder="Leave empty for yourself" />
          <p className="mt-1 text-xs text-gray-500">Only fill if creating a goal for another employee.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Measurement Type *</label>
            <select value={measurementType} onChange={(e) => setMeasurementType(e.target.value as GoalMeasurementType)} className={inputCls}>
              <option value="PERCENTAGE">Percentage</option>
              <option value="NUMERIC">Numeric</option>
              <option value="QUALITATIVE">Qualitative</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Target Value</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className={inputCls}
              placeholder={measurementType === 'PERCENTAGE' ? '100' : 'Target'}
              disabled={measurementType === 'QUALITATIVE'}
            />
          </div>
          <div>
            <label className={labelCls}>Weight (%) *</label>
            <input
              type="number"
              required
              min={1}
              max={100}
              step="1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={inputCls}
              placeholder="e.g. 25"
            />
          </div>
        </div>

        {formError && <ErrorMessage message={formError} />}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Goal'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/performance/goals')}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
