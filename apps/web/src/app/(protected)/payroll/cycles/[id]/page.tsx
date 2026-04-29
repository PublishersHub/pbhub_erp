'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAsync, usePermission, useTableParams, sortLocal, paginateLocal } from '@/lib/hooks';
import {
  getPayrollCycle,
  generatePayroll,
  regeneratePayroll,
  finalizePayroll,
  getCyclePayrolls,
  addPayrollAdjustment,
  removePayrollAdjustment,
} from '@/lib/payroll-api';
import { formatCurrency, formatDate, employeeName } from '@/lib/format';
import type {
  PayrollAdjustmentType,
  PayrollAdjustmentCategory,
  PayrollGenerationResult,
} from '@/types/payroll';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function PayrollCycleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermission();
  const canRun = can('payroll.run');
  const canApprove = can('payroll.approve');
  const { page, sort, order, pageSize, setPage, setSort } = useTableParams();

  const { data: cycle, error, loading, refetch } = useAsync(() => getPayrollCycle(id), [id]);
  const { data: payrolls, error: payError, loading: payLoading, refetch: refetchPayrolls } = useAsync(
    () => getCyclePayrolls(id),
    [id],
  );

  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [genResult, setGenResult] = useState<PayrollGenerationResult | null>(null);

  // Expanded payroll for adjustments
  const [expandedId, setExpandedId] = useState('');

  // Add adjustment form
  const [adjPayrollId, setAdjPayrollId] = useState('');
  const [adjType, setAdjType] = useState<PayrollAdjustmentType>('EARNING');
  const [adjCategory, setAdjCategory] = useState<PayrollAdjustmentCategory>('OTHER');
  const [adjDesc, setAdjDesc] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjError, setAdjError] = useState('');
  const [adjSubmitting, setAdjSubmitting] = useState(false);

  const sorted = useMemo(
    () =>
      sortLocal(payrolls ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'employee':
            return item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : '';
          case 'gross':
            return parseFloat(item.grossEarnings);
          case 'deductions':
            return parseFloat(item.totalDeductions);
          case 'net':
            return parseFloat(item.netPayable);
          default:
            return null;
        }
      }),
    [payrolls, sort, order],
  );

  const { items, total, totalPages } = useMemo(
    () => paginateLocal(sorted, page, pageSize),
    [sorted, page, pageSize],
  );

  async function handleGenerate() {
    setActionError('');
    setActionLoading(true);
    setGenResult(null);
    try {
      const result = await generatePayroll(id);
      setGenResult(result);
      refetch();
      refetchPayrolls();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRegenerate() {
    setActionError('');
    setActionLoading(true);
    setGenResult(null);
    try {
      const result = await regeneratePayroll(id);
      setGenResult(result);
      refetch();
      refetchPayrolls();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Regeneration failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFinalize() {
    setActionError('');
    setActionLoading(true);
    try {
      await finalizePayroll(id);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Finalization failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddAdjustment(e: FormEvent) {
    e.preventDefault();
    if (adjSubmitting) return;
    setAdjError('');
    setAdjSubmitting(true);
    try {
      await addPayrollAdjustment(adjPayrollId, {
        type: adjType,
        category: adjCategory,
        description: adjDesc.trim(),
        amount: parseFloat(adjAmount),
      });
      setAdjPayrollId('');
      setAdjDesc('');
      setAdjAmount('');
      refetchPayrolls();
      refetch();
    } catch (err) {
      setAdjError(err instanceof Error ? err.message : 'Failed to add adjustment');
    } finally {
      setAdjSubmitting(false);
    }
  }

  async function handleRemoveAdjustment(adjustmentId: string) {
    try {
      await removePayrollAdjustment(adjustmentId);
      refetchPayrolls();
      refetch();
    } catch (err) {
      setAdjError(err instanceof Error ? err.message : 'Failed to remove');
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!cycle) return null;

  const isProcessed = cycle.status === 'PROCESSED';
  const isDraft = cycle.status === 'DRAFT';

  return (
    <div>
      <PageHeader
        title={`${MONTHS[cycle.month - 1]} ${cycle.year}`}
        backHref="/payroll/cycles"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={cycle.status} />
            {canRun && isDraft && (
              <button
                onClick={handleGenerate}
                disabled={actionLoading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Generating...' : 'Generate Payroll'}
              </button>
            )}
            {canRun && isProcessed && (
              <button
                onClick={handleRegenerate}
                disabled={actionLoading}
                className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
              >
                {actionLoading ? 'Regenerating...' : 'Regenerate'}
              </button>
            )}
            {canApprove && isProcessed && (
              <button
                onClick={handleFinalize}
                disabled={actionLoading}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? 'Finalizing...' : 'Finalize'}
              </button>
            )}
          </div>
        }
      />

      {actionError && (
        <div className="mb-4"><ErrorMessage message={actionError} /></div>
      )}

      {/* Generation result */}
      {genResult && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h4 className="text-sm font-semibold text-blue-800">Generation Result</h4>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div><span className="text-blue-600">Payrolls:</span> {genResult.payrollCount}</div>
            <div><span className="text-blue-600">Gross:</span> {formatCurrency(genResult.totalGross)}</div>
            <div><span className="text-blue-600">Deductions:</span> {formatCurrency(genResult.totalDeductions)}</div>
            <div><span className="text-blue-600">Net:</span> {formatCurrency(genResult.totalNet)}</div>
          </div>
          {genResult.warnings.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-yellow-800">Warnings:</p>
              <ul className="mt-1 list-disc pl-4 text-xs text-yellow-700">
                {genResult.warnings.map((w, i) => (
                  <li key={i}>{w.employeeCode}: {w.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Cycle details */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <div className="lg:col-span-2 rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Cycle Details</h3>
          <dl>
            <DetailRow label="Period">{formatDate(cycle.periodStart)} — {formatDate(cycle.periodEnd)}</DetailRow>
            <DetailRow label="Employees">{cycle.employeeCount ?? '—'}</DetailRow>
            <DetailRow label="Total Gross">{cycle.totalGross ? formatCurrency(cycle.totalGross) : '—'}</DetailRow>
            <DetailRow label="Total Deductions">{cycle.totalDeductions ? formatCurrency(cycle.totalDeductions) : '—'}</DetailRow>
            <DetailRow label="Total Net">{cycle.totalNet ? formatCurrency(cycle.totalNet) : '—'}</DetailRow>
            {cycle.notes && <DetailRow label="Notes">{cycle.notes}</DetailRow>}
          </dl>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold uppercase text-gray-500">Generated</h3>
            <p className="text-sm text-gray-600">{cycle.generatedAt ? formatDate(cycle.generatedAt) : 'Not yet'}</p>
          </div>
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold uppercase text-gray-500">Finalized</h3>
            <p className="text-sm text-gray-600">
              {cycle.finalizedAt ? formatDate(cycle.finalizedAt) : 'Not yet'}
            </p>
            {cycle.finalizedBy && (
              <p className="text-xs text-gray-400">by {employeeName(cycle.finalizedBy)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Employee payrolls */}
      <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Employee Payrolls</h3>
      {payLoading && <Loading />}
      {payError && <ErrorMessage message={payError} onRetry={refetchPayrolls} />}
      {payrolls && total === 0 && (
        <EmptyState title="No payroll records" description="Generate payroll to create employee records." />
      )}
      {payrolls && total > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Employee" sortKey="employee" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Working Days</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Unpaid Leave</th>
                  <SortableHeader label="Gross" sortKey="gross" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Deductions" sortKey="deductions" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">LOP</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Adjustments</th>
                  <SortableHeader label="Net Pay" sortKey="net" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((p) => (
                  <>
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                        {employeeName(p.employee)}
                        {p.employee?.employeeCode && (
                          <span className="ml-1 text-xs text-gray-400">({p.employee.employeeCode})</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-gray-600">{p.effectiveWorkingDays}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-gray-600">{p.unpaidLeaveDays}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-green-700">{formatCurrency(p.grossEarnings)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-red-600">{formatCurrency(p.totalDeductions)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-orange-600">
                        {parseFloat(p.lossOfPayDeduction) > 0 ? formatCurrency(p.lossOfPayDeduction) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(p.totalAdjustments)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-bold text-gray-900">{formatCurrency(p.netPayable)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <button
                          onClick={() => setExpandedId(expandedId === p.id ? '' : p.id)}
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                        >
                          {expandedId === p.id ? 'Collapse' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === p.id && (
                      <tr key={`${p.id}-detail`}>
                        <td colSpan={9} className="bg-gray-50 px-6 py-4">
                          <div className="grid gap-4 lg:grid-cols-2">
                            {/* Line items */}
                            <div>
                              <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Salary Breakdown</h4>
                              {p.lineItems && p.lineItems.length > 0 ? (
                                <table className="w-full text-xs">
                                  <tbody>
                                    {p.lineItems
                                      .filter((li) => li.type === 'EARNING')
                                      .map((li) => (
                                        <tr key={li.id}>
                                          <td className="py-1 text-gray-600">{li.componentName}</td>
                                          <td className="py-1 text-right text-green-700">{formatCurrency(li.amount)}</td>
                                        </tr>
                                      ))}
                                    {p.lineItems
                                      .filter((li) => li.type === 'DEDUCTION')
                                      .map((li) => (
                                        <tr key={li.id}>
                                          <td className="py-1 text-gray-600">{li.componentName}</td>
                                          <td className="py-1 text-right text-red-600">-{formatCurrency(li.amount)}</td>
                                        </tr>
                                      ))}
                                    {parseFloat(p.lossOfPayDeduction) > 0 && (
                                      <tr>
                                        <td className="py-1 font-medium text-orange-700">Loss of Pay</td>
                                        <td className="py-1 text-right text-orange-700">-{formatCurrency(p.lossOfPayDeduction)}</td>
                                      </tr>
                                    )}
                                    <tr className="border-t border-gray-300">
                                      <td className="py-1 font-bold text-gray-900">Net Payable</td>
                                      <td className="py-1 text-right font-bold text-gray-900">{formatCurrency(p.netPayable)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              ) : (
                                <p className="text-xs text-gray-400">No line items</p>
                              )}
                              <div className="mt-2 text-xs text-gray-500">
                                Working: {p.totalWorkingDays} days | Paid Leave: {p.paidLeaveDays} | Half Days: {p.halfDays} | Holidays: {p.holidayDays}
                              </div>
                            </div>

                            {/* Adjustments */}
                            <div>
                              <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Adjustments</h4>
                              {p.adjustments && p.adjustments.length > 0 ? (
                                <div className="space-y-1">
                                  {p.adjustments.map((adj) => (
                                    <div key={adj.id} className="flex items-center justify-between rounded bg-white p-2 text-xs">
                                      <div>
                                        <span className={adj.type === 'EARNING' ? 'text-green-700' : 'text-red-600'}>
                                          {adj.type === 'EARNING' ? '+' : '-'}{formatCurrency(adj.amount)}
                                        </span>
                                        <span className="ml-1 text-gray-600">{adj.description}</span>
                                        <span className="ml-1 text-gray-400">({adj.category})</span>
                                      </div>
                                      {canRun && isProcessed && (
                                        <button
                                          onClick={() => handleRemoveAdjustment(adj.id)}
                                          className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-100"
                                        >
                                          Remove
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400">No adjustments</p>
                              )}

                              {/* Add adjustment form */}
                              {canRun && isProcessed && (
                                <>
                                  {adjPayrollId === p.id ? (
                                    <form onSubmit={handleAddAdjustment} className="mt-2 space-y-2 rounded border border-blue-100 bg-blue-50 p-2">
                                      <div className="grid grid-cols-2 gap-2">
                                        <select value={adjType} onChange={(e) => setAdjType(e.target.value as PayrollAdjustmentType)} className="rounded border border-gray-300 px-2 py-1 text-xs">
                                          <option value="EARNING">Earning</option>
                                          <option value="DEDUCTION">Deduction</option>
                                        </select>
                                        <select value={adjCategory} onChange={(e) => setAdjCategory(e.target.value as PayrollAdjustmentCategory)} className="rounded border border-gray-300 px-2 py-1 text-xs">
                                          <option value="BONUS">Bonus</option>
                                          <option value="REIMBURSEMENT">Reimbursement</option>
                                          <option value="PENALTY">Penalty</option>
                                          <option value="OVERTIME_PAY">Overtime Pay</option>
                                          <option value="LOAN_REPAYMENT">Loan Repayment</option>
                                          <option value="OTHER">Other</option>
                                        </select>
                                      </div>
                                      <input required value={adjDesc} onChange={(e) => setAdjDesc(e.target.value)} placeholder="Description *" className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
                                      <input type="number" required min={0.01} step="0.01" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} placeholder="Amount *" className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
                                      {adjError && <p className="text-xs text-red-600">{adjError}</p>}
                                      <div className="flex gap-1">
                                        <button type="submit" disabled={adjSubmitting} className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50">
                                          {adjSubmitting ? 'Adding...' : 'Add'}
                                        </button>
                                        <button type="button" onClick={() => { setAdjPayrollId(''); setAdjError(''); }} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200">
                                          Cancel
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <button
                                      onClick={() => setAdjPayrollId(p.id)}
                                      className="mt-2 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                                    >
                                      + Add Adjustment
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
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
