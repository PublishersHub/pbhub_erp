'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { FilterBar } from '@/components/ui/filter-bar';
import { useAsync, usePermission } from '@/lib/hooks';
import {
  getMyBalances,
  getEmployeeBalances,
  initializeBalances,
  adjustBalance,
  listLeavePolicies,
} from '@/lib/leave-api';
import { listEmployees } from '@/lib/employee-api';
import type { LeaveBalance } from '@/types/leave';

export default function LeaveBalancesPage() {
  const { can } = usePermission();
  const canManage = can('leave.manage');
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [employeeId, setEmployeeId] = useState('');
  const [viewMode, setViewMode] = useState<'my' | 'employee'>(canManage ? 'my' : 'my');

  const { data: myBalances, error: myErr, errorStatus: myErrStatus, loading: myLoading, refetch: refetchMy } = useAsync(
    () => (viewMode === 'my' ? getMyBalances(year) : Promise.resolve(null)),
    [viewMode, year],
  );

  const { data: empBalances, error: empErr, errorStatus: empErrStatus, loading: empLoading, refetch: refetchEmp } = useAsync(
    () => (viewMode === 'employee' && employeeId ? getEmployeeBalances(employeeId, year) : Promise.resolve(null)),
    [viewMode, employeeId, year],
  );

  const { data: employees } = useAsync(
    () => (canManage ? listEmployees() : Promise.resolve(null)),
    [],
  );

  const { data: policies } = useAsync(
    () => (canManage ? listLeavePolicies() : Promise.resolve(null)),
    [],
  );

  const balances: LeaveBalance[] | null = viewMode === 'my' ? myBalances : empBalances;
  const balError = viewMode === 'my' ? myErr : empErr;
  const balErrorStatus = viewMode === 'my' ? myErrStatus : empErrStatus;
  const balLoading = viewMode === 'my' ? myLoading : empLoading;

  function refetch() {
    if (viewMode === 'my') refetchMy();
    else refetchEmp();
  }

  // Adjust form
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjPolicyId, setAdjPolicyId] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjError, setAdjError] = useState('');
  const [adjSubmitting, setAdjSubmitting] = useState(false);

  // Initialize
  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState('');

  async function handleInitialize() {
    if (!employeeId || initLoading) return;
    setInitError('');
    setInitLoading(true);
    try {
      await initializeBalances(employeeId, year);
      refetchEmp();
    } catch (err) {
      setInitError(err instanceof Error ? err.message : 'Failed to initialize');
    } finally {
      setInitLoading(false);
    }
  }

  async function handleAdjust(e: FormEvent) {
    e.preventDefault();
    if (adjSubmitting) return;
    setAdjError('');
    setAdjSubmitting(true);
    try {
      await adjustBalance({
        employeeId,
        leavePolicyId: adjPolicyId,
        year,
        adjustment: parseFloat(adjAmount),
      });
      setShowAdjust(false);
      setAdjPolicyId('');
      setAdjAmount('');
      refetchEmp();
    } catch (err) {
      setAdjError(err instanceof Error ? err.message : 'Failed to adjust');
    } finally {
      setAdjSubmitting(false);
    }
  }

  const inputCls =
    'block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear + 1; y >= currentYear - 3; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  return (
    <div>
      <PageHeader title="Leave Balances" />

      <FilterBar hasActiveFilters={viewMode !== 'my' || year !== currentYear} onClear={() => { setViewMode('my'); setYear(currentYear); setEmployeeId(''); }}>
        {canManage && (
          <select
            value={viewMode}
            onChange={(e) => { setViewMode(e.target.value as 'my' | 'employee'); setEmployeeId(''); }}
            className="rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors"
          >
            <option value="my">My Balances</option>
            <option value="employee">By Employee</option>
          </select>
        )}
        {viewMode === 'employee' && canManage && (
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors"
          >
            <option value="">Select employee...</option>
            {(employees ?? []).map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} ({emp.employeeCode})
              </option>
            ))}
          </select>
        )}
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value, 10))}
          className="rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </FilterBar>

      {/* Admin actions for employee view */}
      {viewMode === 'employee' && canManage && employeeId && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            disabled={initLoading}
            onClick={handleInitialize}
            className="rounded-md border border-border bg-card text-foreground hover:bg-muted/50 motion-press transition-colors px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {initLoading ? 'Initializing...' : `Initialize Balances (${year})`}
          </button>
          {!showAdjust ? (
            <button
              onClick={() => setShowAdjust(true)}
              className="rounded-md border border-border bg-card text-foreground hover:bg-muted/50 motion-press transition-colors px-3 py-2 text-sm font-medium"
            >
              Adjust Balance
            </button>
          ) : (
            <form onSubmit={handleAdjust} className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-secondary/30 p-3">
              <div>
                <label className="block text-xs text-muted-foreground">Policy *</label>
                <select required value={adjPolicyId} onChange={(e) => setAdjPolicyId(e.target.value)} className={inputCls}>
                  <option value="">Select...</option>
                  {(policies ?? []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">Adjustment *</label>
                <input required type="number" step="0.5" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} className={inputCls} placeholder="+2 or -1" />
              </div>
              <button type="submit" disabled={adjSubmitting} className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-3 py-2 text-sm font-medium disabled:opacity-50">
                {adjSubmitting ? 'Saving...' : 'Apply'}
              </button>
              <button type="button" onClick={() => { setShowAdjust(false); setAdjPolicyId(''); setAdjAmount(''); }} className="rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 motion-press transition-colors px-3 py-2 text-sm font-medium">
                Cancel
              </button>
              {adjError && <span className="text-xs text-destructive">{adjError}</span>}
            </form>
          )}
          {initError && <span className="text-xs text-destructive">{initError}</span>}
        </div>
      )}

      {balLoading && <Loading />}
      {balError && <ErrorMessage message={balError} status={balErrorStatus} onRetry={refetch} />}
      {!balLoading && !balError && balances && balances.length === 0 && (
        <EmptyState
          title="No leave balances"
          description={
            viewMode === 'employee'
              ? 'Initialize balances for this employee to get started.'
              : `No balances found for ${year}. Contact HR to initialize.`
          }
        />
      )}
      {balances && balances.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {balances.map((b) => (
            <div key={b.id} className="rounded-lg border border-border bg-card p-5 shadow-soft">
              <h3 className="text-sm font-semibold text-foreground">
                {b.leavePolicy?.name ?? '—'}
              </h3>
              <p className="mb-3 text-xs text-muted-foreground/70">{b.leavePolicy?.code}</p>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Entitled</p>
                  <p className="font-medium text-foreground">{b.totalEntitled}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Used</p>
                  <p className="font-medium text-foreground">{b.used}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Carried Forward</p>
                  <p className="font-medium text-foreground">{b.carriedForward}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Adjustments</p>
                  <p className="font-medium text-foreground">{b.adjustments}</p>
                </div>
              </div>
              <div className="mt-3 rounded-md bg-primary-soft px-3 py-2 text-center">
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="text-lg font-bold text-primary">{b.balance} days</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {viewMode === 'employee' && !employeeId && !balLoading && (
        <EmptyState title="Select an employee" description="Choose an employee above to view their balances." />
      )}
    </div>
  );
}
