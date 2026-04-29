'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import {
  useAsync,
  usePermission,
  useTableParams,
  sortLocal,
  paginateLocal,
} from '@/lib/hooks';
import {
  listPerformanceCycles,
  createPerformanceCycle,
  transitionCycle,
} from '@/lib/performance-api';
import { formatDate } from '@/lib/format';
import type { PerformanceCycleStatus } from '@/types/performance';

const TRANSITIONS: Record<string, PerformanceCycleStatus> = {
  DRAFT: 'GOAL_SETTING',
  GOAL_SETTING: 'ACTIVE',
  ACTIVE: 'SELF_REVIEW',
  SELF_REVIEW: 'MANAGER_REVIEW',
  MANAGER_REVIEW: 'CALIBRATION',
  CALIBRATION: 'CLOSED',
};

const TRANSITION_LABELS: Record<string, string> = {
  DRAFT: 'Open Goal Setting',
  GOAL_SETTING: 'Activate',
  ACTIVE: 'Start Self-Review',
  SELF_REVIEW: 'Start Manager Review',
  MANAGER_REVIEW: 'Start Calibration',
  CALIBRATION: 'Close Cycle',
};

export default function PerformanceCyclesPage() {
  const { can } = usePermission();
  const canManage = can('performance.manage');
  const { page, sort, order, pageSize, setPage, setSort } = useTableParams();

  const { data, error, loading, refetch } = useAsync(() => listPerformanceCycles(), []);

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'name': return item.name;
          case 'year': return item.year;
          case 'status': return item.status;
          case 'startDate': return item.startDate;
          default: return null;
        }
      }),
    [data, sort, order],
  );

  const { items, total, totalPages } = useMemo(
    () => paginateLocal(sorted, page, pageSize),
    [sorted, page, pageSize],
  );

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [quarter, setQuarter] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [selfDeadline, setSelfDeadline] = useState('');
  const [mgrDeadline, setMgrDeadline] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [transitioning, setTransitioning] = useState('');

  function resetForm() {
    setName('');
    setYear(new Date().getFullYear().toString());
    setQuarter('1');
    setStartDate('');
    setEndDate('');
    setGoalDeadline('');
    setSelfDeadline('');
    setMgrDeadline('');
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setSubmitting(true);
    try {
      await createPerformanceCycle({
        name: name.trim(),
        year: parseInt(year),
        quarter: parseInt(quarter),
        startDate,
        endDate,
        ...(goalDeadline && { goalSettingDeadline: goalDeadline }),
        ...(selfDeadline && { selfReviewDeadline: selfDeadline }),
        ...(mgrDeadline && { managerReviewDeadline: mgrDeadline }),
      });
      setShowCreate(false);
      resetForm();
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTransition(id: string, nextStatus: PerformanceCycleStatus) {
    setTransitioning(id);
    try {
      await transitionCycle(id, { status: nextStatus });
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Transition failed');
    } finally {
      setTransitioning('');
    }
  }

  const inputCls =
    'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div>
      <PageHeader
        title="Performance Cycles"
        actions={
          canManage && !showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Cycle
            </button>
          ) : undefined
        }
      />

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-4 rounded-lg border bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">New Performance Cycle</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-gray-700">Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Q1 2026 Review" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Year *</label>
              <input type="number" required value={year} onChange={(e) => setYear(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Quarter *</label>
              <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className={inputCls}>
                <option value="1">Q1</option>
                <option value="2">Q2</option>
                <option value="3">Q3</option>
                <option value="4">Q4</option>
              </select>
            </div>
            <div />
            <div>
              <label className="block text-xs font-medium text-gray-700">Start Date *</label>
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">End Date *</label>
              <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
            </div>
            <div />
            <div>
              <label className="block text-xs font-medium text-gray-700">Goal Setting Deadline</label>
              <input type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Self-Review Deadline</label>
              <input type="date" value={selfDeadline} onChange={(e) => setSelfDeadline(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Manager Review Deadline</label>
              <input type="date" value={mgrDeadline} onChange={(e) => setMgrDeadline(e.target.value)} className={inputCls} />
            </div>
          </div>
          {formError && <ErrorMessage message={formError} />}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); resetForm(); }} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </form>
      )}

      {!showCreate && formError && (
        <div className="mb-4"><ErrorMessage message={formError} /></div>
      )}

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && total === 0 && (
        <EmptyState title="No cycles" description="Create performance cycles to start reviews." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Name" sortKey="name" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Year" sortKey="year" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Quarter</th>
                  <SortableHeader label="Start" sortKey="startDate" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">End</th>
                  <SortableHeader label="Status" sortKey="status" currentSort={sort} currentOrder={order} onSort={setSort} />
                  {canManage && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((c) => {
                  const nextStatus = TRANSITIONS[c.status];
                  const nextLabel = TRANSITION_LABELS[c.status];
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{c.year}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">Q{c.quarter}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{formatDate(c.startDate)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{formatDate(c.endDate)}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      {canManage && (
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          {nextStatus && nextLabel && (
                            <button
                              onClick={() => handleTransition(c.id, nextStatus)}
                              disabled={transitioning === c.id}
                              className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                              {transitioning === c.id ? 'Processing...' : nextLabel}
                            </button>
                          )}
                          {c.status === 'CLOSED' && (
                            <span className="text-xs text-gray-400">Closed</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
