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
                className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Generating...' : 'Generate Payroll'}
              </button>
            )}
            {canRun && isProcessed && (
              <button
                onClick={handleRegenerate}
                disabled={actionLoading}
                className="rounded-md bg-warning text-warning-foreground hover:bg-warning/90 motion-press transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Regenerating...' : 'Regenerate'}
              </button>
            )}
            {canApprove && isProcessed && (
              <button
                onClick={handleFinalize}
                disabled={actionLoading}
                className="rounded-md bg-success text-success-foreground hover:bg-success/90 motion-press transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
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
        <div className="mb-4 rounded-lg border border-info/20 bg-info-soft p-4">
          <h4 className="text-sm font-semibold text-info">Generation Result</h4>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div><span className="text-info font-medium">Payrolls:</span> {genResult.payrollCount}</div>
            <div><span className="text-info font-medium">Gross:</span> {formatCurrency(genResult.totalGross)}</div>
            <div><span className="text-info font-medium">Deductions:</span> {formatCurrency(genResult.totalDeductions)}</div>
            <div><span className="text-info font-medium">Net:</span> {formatCurrency(genResult.totalNet)}</div>
          </div>
          {genResult.warnings.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-warning">Warnings:</p>
              <ul className="mt-1 list-disc pl-4 text-xs text-warning/80">
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
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6 shadow-soft">
          <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Cycle Details</h3>
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
          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">Generated</h3>
            <p className="text-sm text-foreground">{cycle.generatedAt ? formatDate(cycle.generatedAt) : 'Not yet'}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">Finalized</h3>
            <p className="text-sm text-foreground">
              {cycle.finalizedAt ? formatDate(cycle.finalizedAt) : 'Not yet'}
            </p>
            {cycle.finalizedBy && (
              <p className="text-xs text-muted-foreground">by {employeeName(cycle.finalizedBy)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Employee payrolls */}
      <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Employee Payrolls</h3>
      {payLoading && <Loading />}
      {payError && <ErrorMessage message={payError} onRetry={refetchPayrolls} />}
      {payrolls && total === 0 && (
        <EmptyState title="No payroll records" description="Generate payroll to create employee records." />
      )}
      {payrolls && total > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <SortableHeader label="Employee" sortKey="employee" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Working Days</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Unpaid Leave</th>
                  <SortableHeader label="Gross" sortKey="gross" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Deductions" sortKey="deductions" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">LOP</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Adjustments</th>
                  <SortableHeader label="Net Pay" sortKey="net" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((p) => (
                  <>
                    <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                        {employeeName(p.employee)}
                        {p.employee?.employeeCode && (
                          <span className="ml-1 text-xs text-muted-foreground">({p.employee.employeeCode})</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-muted-foreground">{p.effectiveWorkingDays}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-muted-foreground">{p.unpaidLeaveDays}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-success">{formatCurrency(p.grossEarnings)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-destructive">{formatCurrency(p.totalDeductions)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-warning">
                        {parseFloat(p.lossOfPayDeduction) > 0 ? formatCurrency(p.lossOfPayDeduction) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right text-muted-foreground">{formatCurrency(p.totalAdjustments)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-right font-bold text-foreground">{formatCurrency(p.netPayable)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <button
                          onClick={() => setExpandedId(expandedId === p.id ? '' : p.id)}
                          className="rounded bg-secondary text-secondary-foreground px-2 py-1 text-xs hover:bg-secondary/80"
                        >
                          {expandedId === p.id ? 'Collapse' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === p.id && (
                      <tr key={`${p.id}-detail`}>
                        <td colSpan={9} className="bg-muted/30 px-6 py-4">
                          <div className="grid gap-4 lg:grid-cols-2">
                            {/* Line items */}
                            <div>
                              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Salary Breakdown</h4>
                              {p.lineItems && p.lineItems.length > 0 ? (
                                <table className="w-full text-xs">
                                  <tbody>
                                    {p.lineItems
                                      .filter((li) => li.type === 'EARNING')
                                      .map((li) => (
                                        <tr key={li.id}>
                                          <td className="py-1 text-muted-foreground">{li.componentName}</td>
                                          <td className="py-1 text-right text-success">{formatCurrency(li.amount)}</td>
                                        </tr>
                                      ))}
                                    {p.lineItems
                                      .filter((li) => li.type === 'DEDUCTION')
                                      .map((li) => (
                                        <tr key={li.id}>
                                          <td className="py-1 text-muted-foreground">{li.componentName}</td>
                                          <td className="py-1 text-right text-destructive">-{formatCurrency(li.amount)}</td>
                                        </tr>
                                      ))}
                                    {parseFloat(p.lossOfPayDeduction) > 0 && (
                                      <tr>
                                        <td className="py-1 font-medium text-warning">Loss of Pay</td>
                                        <td className="py-1 text-right text-warning">-{formatCurrency(p.lossOfPayDeduction)}</td>
                                      </tr>
                                    )}
                                    <tr className="border-t border-border">
                                      <td className="py-1 font-bold text-foreground">Net Payable</td>
                                      <td className="py-1 text-right font-bold text-foreground">{formatCurrency(p.netPayable)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              ) : (
                                <p className="text-xs text-muted-foreground/70">No line items</p>
                              )}
                              <div className="mt-2 text-xs text-muted-foreground">
                                Working: {p.totalWorkingDays} days | Paid Leave: {p.paidLeaveDays} | Half Days: {p.halfDays} | Holidays: {p.holidayDays}
                              </div>
                            </div>

                            {/* Adjustments */}
                            <div>
                              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Adjustments</h4>
                              {p.adjustments && p.adjustments.length > 0 ? (
                                <div className="space-y-1">
                                  {p.adjustments.map((adj) => (
                                    <div key={adj.id} className="flex items-center justify-between rounded bg-card p-2 text-xs border border-border">
                                      <div>
                                        <span className={adj.type === 'EARNING' ? 'text-success' : 'text-destructive'}>
                                          {adj.type === 'EARNING' ? '+' : '-'}{formatCurrency(adj.amount)}
                                        </span>
                                        <span className="ml-1 text-muted-foreground">{adj.description}</span>
                                        <span className="ml-1 text-muted-foreground/70">({adj.category})</span>
                                      </div>
                                      {canRun && isProcessed && (
                                        <button
                                          onClick={() => handleRemoveAdjustment(adj.id)}
                                          className="rounded bg-destructive-soft text-destructive px-1.5 py-0.5 text-xs hover:bg-destructive/20"
                                        >
                                          Remove
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground/70">No adjustments</p>
                              )}

                              {/* Add adjustment form */}
                              {canRun && isProcessed && (
                                <>
                                  {adjPayrollId === p.id ? (
                                    <form onSubmit={handleAddAdjustment} className="mt-2 space-y-2 rounded border border-primary/20 bg-primary-soft p-2">
                                      <div className="grid grid-cols-2 gap-2">
                                        <select value={adjType} onChange={(e) => setAdjType(e.target.value as PayrollAdjustmentType)} className="rounded border border-input px-2 py-1 text-xs bg-card text-foreground">
                                          <option value="EARNING">Earning</option>
                                          <option value="DEDUCTION">Deduction</option>
                                        </select>
                                        <select value={adjCategory} onChange={(e) => setAdjCategory(e.target.value as PayrollAdjustmentCategory)} className="rounded border border-input px-2 py-1 text-xs bg-card text-foreground">
                                          <option value="BONUS">Bonus</option>
                                          <option value="REIMBURSEMENT">Reimbursement</option>
                                          <option value="PENALTY">Penalty</option>
                                          <option value="OVERTIME_PAY">Overtime Pay</option>
                                          <option value="LOAN_REPAYMENT">Loan Repayment</option>
                                          <option value="OTHER">Other</option>
                                        </select>
                                      </div>
                                      <input required value={adjDesc} onChange={(e) => setAdjDesc(e.target.value)} placeholder="Description *" className="w-full rounded border border-input px-2 py-1 text-xs bg-card text-foreground" />
                                      <input type="number" required min={0.01} step="0.01" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} placeholder="Amount *" className="w-full rounded border border-input px-2 py-1 text-xs bg-card text-foreground" />
                                      {adjError && <p className="text-xs text-destructive">{adjError}</p>}
                                      <div className="flex gap-1">
                                        <button type="submit" disabled={adjSubmitting} className="rounded bg-primary text-primary-foreground px-2 py-1 text-xs hover:bg-primary/90 disabled:opacity-50">
                                          {adjSubmitting ? 'Adding...' : 'Add'}
                                        </button>
                                        <button type="button" onClick={() => { setAdjPayrollId(''); setAdjError(''); }} className="rounded bg-secondary text-secondary-foreground px-2 py-1 text-xs hover:bg-secondary/80">
                                          Cancel
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <button
                                      onClick={() => setAdjPayrollId(p.id)}
                                      className="mt-2 rounded bg-primary-soft text-primary px-2 py-1 text-xs hover:bg-primary/20"
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
