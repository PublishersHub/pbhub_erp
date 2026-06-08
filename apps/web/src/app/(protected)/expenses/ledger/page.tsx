'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { useAsync, usePermission } from '@/lib/hooks';
import {
  listLedgerEntries,
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  type LedgerRow,
} from '@/lib/expense-ledger-api';
import { formatCurrency } from '@/lib/format';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

interface Draft {
  date: string;
  particular: string;
  debit: string;
  credit: string;
  notes: string;
}

const EMPTY_DRAFT: Draft = {
  date: todayStr(),
  particular: '',
  debit: '',
  credit: '',
  notes: '',
};

export default function ExpenseLedgerPage() {
  const { can } = usePermission();
  const canEdit = can('expense.approve');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, error, loading, refetch } = useAsync(
    () => listLedgerEntries(from || undefined, to || undefined),
    [from, to],
  );

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSubmitError(null);
  }, [draft, editDraft]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createLedgerEntry({
        date: draft.date,
        particular: draft.particular,
        debit: draft.debit ? parseFloat(draft.debit) : 0,
        credit: draft.credit ? parseFloat(draft.credit) : 0,
        notes: draft.notes || undefined,
      });
      setDraft({ ...EMPTY_DRAFT, date: draft.date });
      refetch();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add entry');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (row: LedgerRow) => {
    setEditingId(row.id);
    setEditDraft({
      date: row.date,
      particular: row.particular,
      debit: row.debit ? String(row.debit) : '',
      credit: row.credit ? String(row.credit) : '',
      notes: row.notes ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(EMPTY_DRAFT);
  };

  const saveEdit = async () => {
    if (!editingId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateLedgerEntry(editingId, {
        date: editDraft.date,
        particular: editDraft.particular,
        debit: editDraft.debit ? parseFloat(editDraft.debit) : 0,
        credit: editDraft.credit ? parseFloat(editDraft.credit) : 0,
        notes: editDraft.notes || undefined,
      });
      cancelEdit();
      refetch();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await deleteLedgerEntry(id);
      refetch();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const inputCls =
    'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div>
      <PageHeader
        title="Expense Ledger"
        description="Simple cash-book: each row is one debit/credit entry. Balance is computed automatically."
      />

      {/* Date filter */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        {(from || to) && (
          <button
            onClick={() => {
              setFrom('');
              setTo('');
            }}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Clear
          </button>
        )}

        {data && (
          <div className="ml-auto flex gap-4 text-sm">
            <span className="text-gray-500">
              Debit total: <strong className="text-red-700">{formatCurrency(data.totals.debit)}</strong>
            </span>
            <span className="text-gray-500">
              Credit total:{' '}
              <strong className="text-green-700">{formatCurrency(data.totals.credit)}</strong>
            </span>
            <span className="text-gray-500">
              Balance:{' '}
              <strong
                className={data.totals.balance < 0 ? 'text-red-700' : 'text-gray-900'}
              >
                {formatCurrency(data.totals.balance)}
              </strong>
            </span>
          </div>
        )}
      </div>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}

      {submitError && (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {data && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600" style={{ width: 130 }}>
                  Date
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">
                  Particular
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-600" style={{ width: 130 }}>
                  Debit
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-600" style={{ width: 130 }}>
                  Credit
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-600" style={{ width: 140 }}>
                  Balance
                </th>
                {canEdit && (
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-600" style={{ width: 130 }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-3 py-8">
                    <EmptyState
                      title="No entries yet"
                      description="Add your first ledger entry below."
                    />
                  </td>
                </tr>
              )}

              {data.rows.map((row) =>
                editingId === row.id ? (
                  <tr key={row.id} className="bg-blue-50/50">
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={editDraft.date}
                        onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={editDraft.particular}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, particular: e.target.value })
                        }
                        className={inputCls}
                        placeholder="Description"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={editDraft.debit}
                        onChange={(e) => setEditDraft({ ...editDraft, debit: e.target.value })}
                        className={`${inputCls} text-right`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={editDraft.credit}
                        onChange={(e) => setEditDraft({ ...editDraft, credit: e.target.value })}
                        className={`${inputCls} text-right`}
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-gray-400">—</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={saveEdit}
                          disabled={submitting}
                          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-600">{row.date}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {row.particular}
                      {row.notes && (
                        <p className="mt-0.5 text-xs text-gray-500">{row.notes}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-sm text-red-700">
                      {row.debit > 0 ? formatCurrency(row.debit) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-sm text-green-700">
                      {row.credit > 0 ? formatCurrency(row.credit) : '—'}
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 text-right text-sm font-semibold ${
                        row.balance < 0 ? 'text-red-700' : 'text-gray-900'
                      }`}
                    >
                      {formatCurrency(row.balance)}
                    </td>
                    {canEdit && (
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEdit(row)}
                            className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => remove(row.id)}
                            className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ),
              )}

              {/* Add row */}
              {canEdit && (
                <tr className="bg-gray-50">
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                      className={inputCls}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={draft.particular}
                      onChange={(e) => setDraft({ ...draft, particular: e.target.value })}
                      className={inputCls}
                      placeholder="What was this for?"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft.debit}
                      onChange={(e) => setDraft({ ...draft, debit: e.target.value })}
                      className={`${inputCls} text-right`}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft.credit}
                      onChange={(e) => setDraft({ ...draft, credit: e.target.value })}
                      className={`${inputCls} text-right`}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-gray-400">—</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={handleAdd}
                      disabled={submitting}
                      className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? 'Adding…' : 'Add'}
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500">
        <strong>How it works:</strong> Type the date and particular, then enter either Debit
        (money out) or Credit (money in). The balance column is the running total = previous balance
        + credit − debit. Edit or delete any row to fix mistakes.
      </div>
    </div>
  );
}
