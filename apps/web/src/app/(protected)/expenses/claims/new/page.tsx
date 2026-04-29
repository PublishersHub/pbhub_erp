'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAsync } from '@/lib/hooks';
import { listExpenseCategories, listExpensePolicies, createExpenseClaim } from '@/lib/expense-api';
import { formatCurrency } from '@/lib/format';

interface ItemRow {
  expenseCategoryId: string;
  description: string;
  amount: string;
  expenseDate: string;
  receiptUrl: string;
  receiptFileName: string;
  notes: string;
}

function emptyItem(): ItemRow {
  return {
    expenseCategoryId: '',
    description: '',
    amount: '',
    expenseDate: '',
    receiptUrl: '',
    receiptFileName: '',
    notes: '',
  };
}

export default function NewExpenseClaimPage() {
  const router = useRouter();
  const { data: categories } = useAsync(() => listExpenseCategories(), []);
  const { data: policies } = useAsync(() => listExpensePolicies(), []);

  const activeCategories = (categories ?? []).filter((c) => c.isActive);
  const activePolicies = (policies ?? []).filter((p) => p.isActive);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [policyId, setPolicyId] = useState('');
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof ItemRow, value: string) {
    setItems((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  const totalAmount = items.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  const selectedPolicy = activePolicies.find((p) => p.id === policyId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const validItems = items.filter((r) => r.expenseCategoryId && r.description.trim() && r.amount && r.expenseDate);
    if (validItems.length === 0) {
      setFormError('Add at least one complete line item');
      return;
    }

    setFormError('');
    setSubmitting(true);
    try {
      await createExpenseClaim({
        title: title.trim(),
        ...(description.trim() && { description: description.trim() }),
        ...(policyId && { expensePolicyId: policyId }),
        items: validItems.map((r) => ({
          expenseCategoryId: r.expenseCategoryId,
          description: r.description.trim(),
          amount: parseFloat(r.amount),
          expenseDate: r.expenseDate,
          ...(r.receiptUrl.trim() && { receiptUrl: r.receiptUrl.trim() }),
          ...(r.receiptFileName.trim() && { receiptFileName: r.receiptFileName.trim() }),
          ...(r.notes.trim() && { notes: r.notes.trim() }),
        })),
      });
      router.push('/expenses/claims');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create claim');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-700';

  return (
    <div>
      <PageHeader title="New Expense Claim" backHref="/expenses/claims" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold uppercase text-gray-500">Claim Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Title *</label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. April Travel Expenses" />
            </div>
            <div>
              <label className={labelCls}>Expense Policy</label>
              <select value={policyId} onChange={(e) => setPolicyId(e.target.value)} className={inputCls}>
                <option value="">None</option>
                {activePolicies.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} placeholder="Optional details about this claim" />
          </div>

          {selectedPolicy && (
            <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
              <p className="font-medium">Policy: {selectedPolicy.name}</p>
              {selectedPolicy.maxClaimAmount && <p>Max claim: {formatCurrency(selectedPolicy.maxClaimAmount)}</p>}
              {selectedPolicy.maxItemAmount && <p>Max per item: {formatCurrency(selectedPolicy.maxItemAmount)}</p>}
              {selectedPolicy.receiptRequiredAbove && <p>Receipt required above: {formatCurrency(selectedPolicy.receiptRequiredAbove)}</p>}
              {selectedPolicy.autoApproveBelow && <p>Auto-approve below: {formatCurrency(selectedPolicy.autoApproveBelow)}</p>}
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase text-gray-500">Line Items</h3>
            <button type="button" onClick={addItem} className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
              + Add Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="rounded-md border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Item {idx + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100">
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className={labelCls}>Category *</label>
                    <select value={item.expenseCategoryId} onChange={(e) => updateItem(idx, 'expenseCategoryId', e.target.value)} className={inputCls}>
                      <option value="">Select...</option>
                      {activeCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Amount *</label>
                    <input type="number" min={0.01} step="0.01" value={item.amount} onChange={(e) => updateItem(idx, 'amount', e.target.value)} className={inputCls} placeholder="0.00" />
                  </div>
                  <div>
                    <label className={labelCls}>Date *</label>
                    <input type="date" value={item.expenseDate} onChange={(e) => updateItem(idx, 'expenseDate', e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Description *</label>
                  <input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} className={inputCls} placeholder="What was the expense for?" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className={labelCls}>Receipt URL</label>
                    <input value={item.receiptUrl} onChange={(e) => updateItem(idx, 'receiptUrl', e.target.value)} className={inputCls} placeholder="https://..." />
                  </div>
                  <div>
                    <label className={labelCls}>Receipt File Name</label>
                    <input value={item.receiptFileName} onChange={(e) => updateItem(idx, 'receiptFileName', e.target.value)} className={inputCls} placeholder="receipt.pdf" />
                  </div>
                  <div>
                    <label className={labelCls}>Notes</label>
                    <input value={item.notes} onChange={(e) => updateItem(idx, 'notes', e.target.value)} className={inputCls} placeholder="Optional" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 flex justify-end">
            <div className="rounded-md bg-gray-50 px-4 py-2 text-right">
              <span className="text-sm text-gray-500">Total: </span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>

        {formError && <ErrorMessage message={formError} />}

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create Draft'}
          </button>
          <button type="button" onClick={() => router.push('/expenses/claims')} className="rounded-md bg-gray-100 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
