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

  const { data: myBalances, error: myErr, loading: myLoading, refetch: refetchMy } = useAsync(
    () => (viewMode === 'my' ? getMyBalances(year) : Promise.resolve(null)),
    [viewMode, year],
  );

  const { data: empBalances, error: empErr, loading: empLoading, refetch: refetchEmp } = useAsync(
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
    'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

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
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="my">My Balances</option>
            <option value="employee">By Employee</option>
          </select>
        )}
        {viewMode === 'employee' && canManage && (
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {initLoading ? 'Initializing...' : `Initialize Balances (${year})`}
          </button>
          {!showAdjust ? (
            <button
              onClick={() => setShowAdjust(true)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Adjust Balance
            </button>
          ) : (
            <form onSubmit={handleAdjust} className="flex flex-wrap items-end gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
              <div>
                <label className="block text-xs text-gray-600">Policy *</label>
                <select required value={adjPolicyId} onChange={(e) => setAdjPolicyId(e.target.value)} className={inputCls}>
                  <option value="">Select...</option>
                  {(policies ?? []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600">Adjustment *</label>
                <input required type="number" step="0.5" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} className={inputCls} placeholder="+2 or -1" />
              </div>
              <button type="submit" disabled={adjSubmitting} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {adjSubmitting ? 'Saving...' : 'Apply'}
              </button>
              <button type="button" onClick={() => { setShowAdjust(false); setAdjPolicyId(''); setAdjAmount(''); }} className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                Cancel
              </button>
              {adjError && <span className="text-xs text-red-600">{adjError}</span>}
            </form>
          )}
          {initError && <span className="text-xs text-red-600">{initError}</span>}
        </div>
      )}

      {balLoading && <Loading />}
      {balError && <ErrorMessage message={balError} onRetry={refetch} />}
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
            <div key={b.id} className="rounded-lg border bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900">
                {b.leavePolicy?.name ?? '—'}
              </h3>
              <p className="mb-3 text-xs text-gray-400">{b.leavePolicy?.code}</p>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Entitled</p>
                  <p className="font-medium text-gray-900">{b.totalEntitled}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Used</p>
                  <p className="font-medium text-gray-900">{b.used}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Carried Forward</p>
                  <p className="font-medium text-gray-900">{b.carriedForward}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Adjustments</p>
                  <p className="font-medium text-gray-900">{b.adjustments}</p>
                </div>
              </div>
              <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-center">
                <p className="text-xs text-gray-500">Available</p>
                <p className="text-lg font-bold text-blue-700">{b.balance} days</p>
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
