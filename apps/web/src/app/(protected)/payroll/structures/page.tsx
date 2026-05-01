'use client';

import { useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAsync, usePermission } from '@/lib/hooks';
import { listEmployees } from '@/lib/employee-api';
import {
  listSalaryComponents,
  getEmployeeSalaryStructure,
  getEmployeeSalaryHistory,
  setSalaryStructure,
} from '@/lib/payroll-api';
import { formatDate, formatCurrency, employeeName } from '@/lib/format';

export default function SalaryStructuresPage() {
  const { can } = usePermission();
  const canManage = can('payroll.run');
  const canRead = can('payroll.read');

  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const { data: employees } = useAsync(
    () => (canRead ? listEmployees() : Promise.resolve(null)),
    [],
  );
  const { data: components } = useAsync(
    () => (canManage ? listSalaryComponents() : Promise.resolve(null)),
    [],
  );

  const { data: structure, error: structureError, loading: structureLoading, refetch: refetchStructure } = useAsync(
    () => (selectedEmpId ? getEmployeeSalaryStructure(selectedEmpId) : Promise.resolve(null)),
    [selectedEmpId],
  );

  const { data: history, loading: historyLoading } = useAsync(
    () => (selectedEmpId && showHistory ? getEmployeeSalaryHistory(selectedEmpId) : Promise.resolve(null)),
    [selectedEmpId, showHistory],
  );

  // Set structure form
  const [showSetForm, setShowSetForm] = useState(false);
  const [setEmpId, setSetEmpId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [notes, setNotes] = useState('');
  const [compRows, setCompRows] = useState<{ salaryComponentId: string; amount: string }[]>([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeComponents = (components ?? []).filter((c) => c.isActive);

  function addRow() {
    setCompRows((prev) => [...prev, { salaryComponentId: '', amount: '' }]);
  }

  function removeRow(idx: number) {
    setCompRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, field: 'salaryComponentId' | 'amount', value: string) {
    setCompRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  async function handleSet(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const validRows = compRows.filter((r) => r.salaryComponentId && r.amount);
    if (validRows.length === 0) {
      setFormError('Add at least one component');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      await setSalaryStructure({
        employeeId: setEmpId,
        effectiveFrom,
        ...(notes.trim() && { notes: notes.trim() }),
        components: validRows.map((r) => ({
          salaryComponentId: r.salaryComponentId,
          amount: parseFloat(r.amount),
        })),
      });
      setShowSetForm(false);
      setSetEmpId('');
      setEffectiveFrom('');
      setNotes('');
      setCompRows([]);
      // Refresh if viewing this employee
      if (setEmpId === selectedEmpId) refetchStructure();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to set structure');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    'block w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50 transition-colors bg-card text-foreground';

  return (
    <div>
      <PageHeader
        title="Salary Structures"
        actions={
          canManage && !showSetForm ? (
            <button
              onClick={() => {
                setShowSetForm(true);
                if (compRows.length === 0) addRow();
              }}
              className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium"
            >
              Set Structure
            </button>
          ) : undefined
        }
      />

      {/* Set structure form */}
      {showSetForm && (
        <form onSubmit={handleSet} className="mb-6 rounded-lg border border-border bg-card p-4 shadow-soft space-y-4">
          <h3 className="text-sm font-semibold text-foreground/80">Set Employee Salary Structure</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-foreground/80">Employee *</label>
              <select required value={setEmpId} onChange={(e) => setSetEmpId(e.target.value)} className={inputCls}>
                <option value="">Select...</option>
                {(employees ?? []).map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80">Effective From *</label>
              <input type="date" required value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80">Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Optional notes" />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs font-medium text-foreground/80">Components *</label>
              <button type="button" onClick={addRow} className="rounded bg-secondary text-secondary-foreground px-2 py-1 text-xs hover:bg-secondary/80">
                + Add Row
              </button>
            </div>
            {compRows.length === 0 && (
              <p className="text-xs text-muted-foreground">Click &quot;+ Add Row&quot; to add salary components.</p>
            )}
            <div className="space-y-2">
              {compRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={row.salaryComponentId}
                    onChange={(e) => updateRow(idx, 'salaryComponentId', e.target.value)}
                    className="flex-1 rounded-md border border-input px-2 py-1.5 text-sm bg-card text-foreground"
                  >
                    <option value="">Select component...</option>
                    {activeComponents.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Amount"
                    value={row.amount}
                    onChange={(e) => updateRow(idx, 'amount', e.target.value)}
                    className="w-32 rounded-md border border-input px-2 py-1.5 text-sm bg-card text-foreground"
                  />
                  <button type="button" onClick={() => removeRow(idx)} className="rounded bg-destructive-soft text-destructive px-2 py-1 text-xs hover:bg-destructive/20">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {formError && <ErrorMessage message={formError} />}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50">
              {submitting ? 'Saving...' : 'Save Structure'}
            </button>
            <button type="button" onClick={() => { setShowSetForm(false); setCompRows([]); setFormError(''); }} className="rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 motion-press transition-colors px-4 py-2 text-sm font-medium">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Lookup */}
      {canRead && (
        <div className="mb-6">
          <label className="block text-xs font-medium text-foreground/80 mb-1">Lookup by Employee</label>
          <div className="flex gap-2">
            <select
              value={selectedEmpId}
              onChange={(e) => { setSelectedEmpId(e.target.value); setShowHistory(false); }}
              className="rounded-md border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none bg-card text-foreground"
            >
              <option value="">Select employee...</option>
              {(employees ?? []).map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeCode})
                </option>
              ))}
            </select>
            {selectedEmpId && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="rounded-md bg-secondary text-secondary-foreground px-3 py-2 text-sm font-medium hover:bg-secondary/80"
              >
                {showHistory ? 'Current' : 'History'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Current structure */}
      {selectedEmpId && !showHistory && (
        <>
          {structureLoading && <Loading />}
          {structureError && <ErrorMessage message={structureError} onRetry={refetchStructure} />}
          {!structureLoading && !structureError && !structure && (
            <EmptyState title="No salary structure" description="This employee has no active salary structure." />
          )}
          {structure && (
            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase text-muted-foreground">Current Structure</h3>
                <span className="text-xs text-muted-foreground">Effective from {formatDate(structure.effectiveFrom)}</span>
              </div>
              {structure.notes && (
                <p className="mb-4 text-sm text-muted-foreground">{structure.notes}</p>
              )}
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Component</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Code</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Type</th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {structure.components.map((sc) => (
                    <tr key={sc.id}>
                      <td className="px-4 py-2 text-foreground">{sc.salaryComponent.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{sc.salaryComponent.code}</td>
                      <td className="px-4 py-2"><StatusBadge status={sc.salaryComponent.type} /></td>
                      <td className="px-4 py-2 text-right font-medium text-foreground">{formatCurrency(sc.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-primary-soft border-t border-primary/20">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm font-medium text-foreground">Gross Salary</td>
                    <td className="px-4 py-2 text-right font-bold text-success">{formatCurrency(structure.grossSalary)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm font-medium text-foreground">Total Deductions</td>
                    <td className="px-4 py-2 text-right font-bold text-destructive">{formatCurrency(structure.totalDeductions)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm font-bold text-foreground">Net Salary</td>
                    <td className="px-4 py-2 text-right font-bold text-foreground">{formatCurrency(structure.netSalary)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      {/* History */}
      {selectedEmpId && showHistory && (
        <>
          {historyLoading && <Loading />}
          {history && history.length === 0 && (
            <EmptyState title="No history" description="No salary structure history for this employee." />
          )}
          {history && history.length > 0 && (
            <div className="space-y-4">
              {history.map((h) => (
                <div key={h.id} className={`rounded-lg border p-4 shadow-soft ${h.isActive ? 'bg-primary-soft border-primary/20' : 'bg-muted'}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">Effective: {formatDate(h.effectiveFrom)}</span>
                      {h.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-success-soft text-success px-2 py-0.5 text-xs font-medium">Current</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted-foreground/20 text-muted-foreground px-2 py-0.5 text-xs font-medium">Superseded</span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-foreground">Net: {formatCurrency(h.netSalary)}</span>
                  </div>
                  {h.notes && <p className="mb-2 text-xs text-muted-foreground">{h.notes}</p>}
                  <div className="flex flex-wrap gap-2">
                    {h.components.map((sc) => (
                      <span key={sc.id} className="inline-flex items-center gap-1 rounded bg-secondary text-secondary-foreground px-2 py-1 text-xs">
                        <span className="font-medium">{sc.salaryComponent.code}:</span>
                        <span>{formatCurrency(sc.amount)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
