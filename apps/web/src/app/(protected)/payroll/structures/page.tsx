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
    'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

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
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Set Structure
            </button>
          ) : undefined
        }
      />

      {/* Set structure form */}
      {showSetForm && (
        <form onSubmit={handleSet} className="mb-6 rounded-lg border bg-white p-4 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Set Employee Salary Structure</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-700">Employee *</label>
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
              <label className="block text-xs font-medium text-gray-700">Effective From *</label>
              <input type="date" required value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Optional notes" />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-700">Components *</label>
              <button type="button" onClick={addRow} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200">
                + Add Row
              </button>
            </div>
            {compRows.length === 0 && (
              <p className="text-xs text-gray-500">Click &quot;+ Add Row&quot; to add salary components.</p>
            )}
            <div className="space-y-2">
              {compRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={row.salaryComponentId}
                    onChange={(e) => updateRow(idx, 'salaryComponentId', e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
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
                    className="w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <button type="button" onClick={() => removeRow(idx)} className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {formError && <ErrorMessage message={formError} />}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Saving...' : 'Save Structure'}
            </button>
            <button type="button" onClick={() => { setShowSetForm(false); setCompRows([]); setFormError(''); }} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Lookup */}
      {canRead && (
        <div className="mb-6">
          <label className="block text-xs font-medium text-gray-700 mb-1">Lookup by Employee</label>
          <div className="flex gap-2">
            <select
              value={selectedEmpId}
              onChange={(e) => { setSelectedEmpId(e.target.value); setShowHistory(false); }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
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
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase text-gray-500">Current Structure</h3>
                <span className="text-xs text-gray-500">Effective from {formatDate(structure.effectiveFrom)}</span>
              </div>
              {structure.notes && (
                <p className="mb-4 text-sm text-gray-600">{structure.notes}</p>
              )}
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Component</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Code</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {structure.components.map((sc) => (
                    <tr key={sc.id}>
                      <td className="px-4 py-2 text-gray-900">{sc.salaryComponent.name}</td>
                      <td className="px-4 py-2 text-gray-600">{sc.salaryComponent.code}</td>
                      <td className="px-4 py-2"><StatusBadge status={sc.salaryComponent.type} /></td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(sc.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm font-medium text-gray-700">Gross Salary</td>
                    <td className="px-4 py-2 text-right font-bold text-green-700">{formatCurrency(structure.grossSalary)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm font-medium text-gray-700">Total Deductions</td>
                    <td className="px-4 py-2 text-right font-bold text-red-600">{formatCurrency(structure.totalDeductions)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm font-bold text-gray-900">Net Salary</td>
                    <td className="px-4 py-2 text-right font-bold text-gray-900">{formatCurrency(structure.netSalary)}</td>
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
                <div key={h.id} className={`rounded-lg border p-4 shadow-sm ${h.isActive ? 'bg-white border-blue-200' : 'bg-gray-50'}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">Effective: {formatDate(h.effectiveFrom)}</span>
                      {h.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Current</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">Superseded</span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-gray-900">Net: {formatCurrency(h.netSalary)}</span>
                  </div>
                  {h.notes && <p className="mb-2 text-xs text-gray-500">{h.notes}</p>}
                  <div className="flex flex-wrap gap-2">
                    {h.components.map((sc) => (
                      <span key={sc.id} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs">
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
