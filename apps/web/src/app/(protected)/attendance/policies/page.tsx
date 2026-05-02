'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  useAsync,
  usePermission,
  useTableParams,
  sortLocal,
  paginateLocal,
} from '@/lib/hooks';
import {
  listAttendancePolicies,
  createAttendancePolicy,
  deactivateAttendancePolicy,
} from '@/lib/attendance-api';
import type { AttendancePolicyType } from '@/types/attendance';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AttendancePoliciesPage() {
  const { can } = usePermission();
  const canManage = can('attendance.manage');
  const { page, sort, order, pageSize, setPage, setSort } = useTableParams();

  const { data, error, errorStatus, loading, refetch } = useAsync(() => listAttendancePolicies(), []);

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'name':
            return item.name;
          case 'type':
            return item.policyType;
          case 'assignments':
            return item._count?.assignments ?? 0;
          default:
            return null;
        }
      }),
    [data, sort, order],
  );

  const { items, total, totalPages } = useMemo(
    () => paginateLocal(sorted, page, pageSize),
    [sorted, page, pageSize],
  );

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [policyType, setPolicyType] = useState<AttendancePolicyType>('FIXED');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [minHours, setMinHours] = useState('');
  const [coreStart, setCoreStart] = useState('');
  const [coreEnd, setCoreEnd] = useState('');
  const [graceLate, setGraceLate] = useState('15');
  const [graceEarly, setGraceEarly] = useState('15');
  const [halfDayThreshold, setHalfDayThreshold] = useState('');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function toggleDay(day: number) {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setSubmitting(true);
    try {
      await createAttendancePolicy({
        name: name.trim(),
        policyType,
        ...(policyType === 'FIXED' && startTime && { startTime }),
        ...(policyType === 'FIXED' && endTime && { endTime }),
        ...(policyType === 'FLEXIBLE' && minHours && { minHoursPerDay: parseFloat(minHours) }),
        ...(policyType === 'FLEXIBLE' && coreStart && { coreStartTime: coreStart }),
        ...(policyType === 'FLEXIBLE' && coreEnd && { coreEndTime: coreEnd }),
        graceMinutesLate: parseInt(graceLate, 10) || 0,
        graceMinutesEarly: parseInt(graceEarly, 10) || 0,
        ...(halfDayThreshold && { halfDayThresholdMinutes: parseInt(halfDayThreshold, 10) }),
        workingDays,
      });
      setShowCreate(false);
      resetForm();
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create policy');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setName('');
    setPolicyType('FIXED');
    setStartTime('09:00');
    setEndTime('17:00');
    setMinHours('');
    setCoreStart('');
    setCoreEnd('');
    setGraceLate('15');
    setGraceEarly('15');
    setHalfDayThreshold('');
    setWorkingDays([1, 2, 3, 4, 5]);
  }

  async function handleDeactivate(id: string) {
    try {
      await deactivateAttendancePolicy(id);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to deactivate');
    }
  }

  const inputCls =
    'block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';

  return (
    <div>
      <PageHeader
        title="Attendance Policies"
        actions={
          canManage && !showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium"
            >
              Create Policy
            </button>
          ) : undefined
        }
      />

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-4 rounded-lg border border-border bg-card p-4 shadow-soft space-y-4">
          <h3 className="text-sm font-semibold text-foreground">New Attendance Policy</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-foreground/80">Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Standard Office Hours" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80">Type *</label>
              <select value={policyType} onChange={(e) => setPolicyType(e.target.value as AttendancePolicyType)} className={inputCls}>
                <option value="FIXED">Fixed</option>
                <option value="FLEXIBLE">Flexible</option>
              </select>
            </div>
          </div>

          {policyType === 'FIXED' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground/80">Start Time</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/80">End Time</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          {policyType === 'FLEXIBLE' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-foreground/80">Min Hours/Day</label>
                <input type="number" min={0} step="0.5" value={minHours} onChange={(e) => setMinHours(e.target.value)} className={inputCls} placeholder="8" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/80">Core Start</label>
                <input type="time" value={coreStart} onChange={(e) => setCoreStart(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/80">Core End</label>
                <input type="time" value={coreEnd} onChange={(e) => setCoreEnd(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-foreground/80">Grace (Late mins)</label>
              <input type="number" min={0} value={graceLate} onChange={(e) => setGraceLate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80">Grace (Early mins)</label>
              <input type="number" min={0} value={graceEarly} onChange={(e) => setGraceEarly(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80">Half-day Threshold (mins)</label>
              <input type="number" min={0} value={halfDayThreshold} onChange={(e) => setHalfDayThreshold(e.target.value)} className={inputCls} placeholder="240" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1">Working Days</label>
            <div className="flex gap-2">
              {DAYS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium motion-press transition-colors ${
                    workingDays.includes(i)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {formError && <ErrorMessage message={formError} />}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); resetForm(); }} className="rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 motion-press transition-colors px-4 py-2 text-sm font-medium">
              Cancel
            </button>
          </div>
        </form>
      )}

      {!showCreate && formError && (
        <div className="mb-4"><ErrorMessage message={formError} /></div>
      )}

      {loading && <Loading />}
      {error && <ErrorMessage message={error} status={errorStatus} onRetry={refetch} fallback={{ label: 'View attendance', href: '/attendance' }} />}
      {data && total === 0 && (
        <EmptyState title="No policies" description="Create an attendance policy to get started." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <SortableHeader label="Name" sortKey="name" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Type" sortKey="type" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Schedule</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Grace</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Working Days</th>
                  <SortableHeader label="Assignments" sortKey="assignments" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                  {canManage && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-primary">
                      <Link href={`/attendance/policies/${p.id}`} className="hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.policyType} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.policyType === 'FIXED' ? (
                        <span>{p.startTime ?? '—'} - {p.endTime ?? '—'}</span>
                      ) : (
                        <span>Min {p.minHoursPerDay ?? '—'}h{p.coreStartTime ? ` / Core ${p.coreStartTime}–${p.coreEndTime}` : ''}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      Late: {p.graceMinutesLate}m / Early: {p.graceMinutesEarly}m
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.workingDays.map((d) => DAYS[d]).join(', ')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                      {p._count?.assignments ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      {p.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">Active</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">Inactive</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {p.isActive && (
                          <button
                            onClick={() => handleDeactivate(p.id)}
                            className="rounded bg-destructive-soft text-destructive hover:bg-destructive/20 transition-colors px-2 py-1 text-xs font-medium"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
