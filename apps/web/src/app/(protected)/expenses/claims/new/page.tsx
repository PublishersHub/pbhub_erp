'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingButton } from '@/components/ui/loading-button';
import { FileUpload } from '@/components/ui/file-upload';
import { useToast } from '@/components/toast';
import { useAsync } from '@/lib/hooks';
import { listExpenseCategories, listExpensePolicies, createExpenseClaim } from '@/lib/expense-api';
import { formatCurrency } from '@/lib/format';
import { uploadFile } from '@/lib/upload-api';

interface ItemRow {
  expenseCategoryId: string;
  description: string;
  amount: string;
  expenseDate: string;
  receiptUrl: string;
  receiptFileName: string;
  receiptUploading: boolean;
  receiptError: string;
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
    receiptUploading: false,
    receiptError: '',
    notes: '',
  };
}

export default function NewExpenseClaimPage() {
  const router = useRouter();
  const toast = useToast();
  const { data: categories } = useAsync(() => listExpenseCategories(), []);
  const { data: policies } = useAsync(() => listExpensePolicies(), []);

  const activeCategories = (categories ?? []).filter((c) => c.isActive);
  const activePolicies = (policies ?? []).filter((p) => p.isActive);

  useEffect(() => {
    document.title = 'Submit Claim · PbHub';
  }, []);

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

  function updateItem<K extends keyof ItemRow>(idx: number, field: K, value: ItemRow[K]) {
    setItems((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function patchItem(idx: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function handleReceiptFiles(idx: number, files: File[]) {
    const file = files[0];
    if (!file) {
      // User cleared the file — drop the receipt info for this row
      patchItem(idx, {
        receiptUrl: '',
        receiptFileName: '',
        receiptUploading: false,
        receiptError: '',
      });
      return;
    }

    // Optimistically show "Uploading…" and clear any prior error / stored key
    patchItem(idx, {
      receiptUploading: true,
      receiptError: '',
      receiptUrl: '',
      receiptFileName: file.name,
    });

    try {
      const { key, filename } = await uploadFile(file, 'expense-receipt');
      patchItem(idx, {
        receiptUrl: key,
        receiptFileName: filename || file.name,
        receiptUploading: false,
        receiptError: '',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      patchItem(idx, {
        receiptUploading: false,
        receiptError: msg,
        receiptUrl: '',
        receiptFileName: '',
      });
      toast.error('Receipt upload failed', msg);
    }
  }

  function clearReceipt(idx: number) {
    patchItem(idx, {
      receiptUrl: '',
      receiptFileName: '',
      receiptUploading: false,
      receiptError: '',
    });
  }

  const anyUploading = items.some((i) => i.receiptUploading);

  const totalAmount = items.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  const selectedPolicy = activePolicies.find((p) => p.id === policyId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (anyUploading) {
      setFormError('Please wait for receipt uploads to finish');
      return;
    }

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
      toast.success('Draft created', 'Your expense claim was saved as a draft.');
      router.push('/expenses/claims');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create claim';
      setFormError(msg);
      toast.error('Could not create claim', msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    'block w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50 transition-colors bg-card text-foreground';
  const labelCls = 'block text-xs font-medium text-foreground/80';

  return (
    <div>
      <PageHeader title="New Expense Claim" backHref="/expenses/claims" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Claim Details</h3>
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
            <div className="rounded-md bg-info-soft p-3 text-xs text-info space-y-1">
              <p className="font-medium">Policy: {selectedPolicy.name}</p>
              {selectedPolicy.maxClaimAmount && <p>Max claim: {formatCurrency(selectedPolicy.maxClaimAmount)}</p>}
              {selectedPolicy.maxItemAmount && <p>Max per item: {formatCurrency(selectedPolicy.maxItemAmount)}</p>}
              {selectedPolicy.receiptRequiredAbove && <p>Receipt required above: {formatCurrency(selectedPolicy.receiptRequiredAbove)}</p>}
              {selectedPolicy.autoApproveBelow && <p>Auto-approve below: {formatCurrency(selectedPolicy.autoApproveBelow)}</p>}
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">Line Items</h3>
            <button type="button" onClick={addItem} className="rounded-md bg-secondary text-secondary-foreground px-3 py-1.5 text-xs font-medium hover:bg-secondary/80">
              + Add Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="rounded-md border border-border bg-background p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="rounded bg-destructive-soft text-destructive px-2 py-1 text-xs hover:bg-destructive/20">
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
                <div>
                  <label className={labelCls}>Receipt</label>
                  {item.receiptUploading ? (
                    <div className="mt-1 flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm text-muted-foreground">
                      <svg className="h-4 w-4 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      <span>Uploading {item.receiptFileName || 'file'}…</span>
                    </div>
                  ) : item.receiptUrl ? (
                    <div className="mt-1 flex items-center gap-2 rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm">
                      <svg className="h-4 w-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="flex-1 truncate text-success">
                        Uploaded <span className="font-medium">{item.receiptFileName}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => clearReceipt(idx)}
                        className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <FileUpload
                      accept="image/*,application/pdf"
                      multiple={false}
                      maxSizeMb={10}
                      value={[]}
                      onChange={(files) => handleReceiptFiles(idx, files)}
                      hint="Image or PDF, up to 10 MB"
                      className="mt-1"
                    />
                  )}
                  {item.receiptError && (
                    <p className="mt-1 text-xs text-destructive">{item.receiptError}</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Notes</label>
                  <input value={item.notes} onChange={(e) => updateItem(idx, 'notes', e.target.value)} className={inputCls} placeholder="Optional" />
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 flex justify-end">
            <div className="rounded-md bg-primary-soft border border-primary/20 px-4 py-2 text-right">
              <span className="text-sm text-muted-foreground">Total: </span>
              <span className="text-lg font-bold text-primary">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>

        {formError && <ErrorMessage message={formError} />}

        <div className="flex gap-3">
          <LoadingButton type="submit" loading={submitting} loadingText="Creating…" className="px-6">
            Create Draft
          </LoadingButton>
          <button type="button" onClick={() => router.push('/expenses/claims')} className="rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 motion-press transition-colors px-6 py-2 text-sm font-medium">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
