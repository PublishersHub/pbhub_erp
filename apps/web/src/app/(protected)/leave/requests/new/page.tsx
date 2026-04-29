'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { Loading } from '@/components/ui/loading';
import { useAsync } from '@/lib/hooks';
import { createLeaveRequest, getMyBalances } from '@/lib/leave-api';

export default function NewLeaveRequestPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentYear = new Date().getFullYear();
  const { data: balances, loading: balLoading } = useAsync(
    () => getMyBalances(currentYear),
    [currentYear],
  );

  const [leavePolicyId, setLeavePolicyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState('');

  const selectedBalance = balances?.find((b) => b.leavePolicyId === leavePolicyId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await createLeaveRequest({
        leavePolicyId,
        startDate,
        endDate,
        ...(isHalfDay && { isHalfDay }),
        ...(reason.trim() && { reason: reason.trim() }),
      });
      router.push(`/leave/requests/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-sm font-medium text-gray-700';

  if (balLoading) {
    return (
      <div>
        <PageHeader title="New Leave Request" backHref="/leave/requests" />
        <Loading />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="New Leave Request" backHref="/leave/requests" />

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-5 rounded-lg border bg-white p-6 shadow-sm"
      >
        <div>
          <label className={labelCls}>Leave Type *</label>
          {balances && balances.length > 0 ? (
            <select
              required
              value={leavePolicyId}
              onChange={(e) => setLeavePolicyId(e.target.value)}
              className={inputCls}
            >
              <option value="">Select leave type...</option>
              {balances.map((b) => (
                <option key={b.leavePolicyId} value={b.leavePolicyId}>
                  {b.leavePolicy?.name ?? b.leavePolicyId} — {b.balance} days available
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1 text-sm text-gray-500">
              No leave balances found for {currentYear}. Contact HR to initialize your balances.
            </p>
          )}
        </div>

        {selectedBalance && (
          <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-500">Entitled</p>
                <p className="font-semibold text-gray-900">{selectedBalance.totalEntitled}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Used</p>
                <p className="font-semibold text-gray-900">{selectedBalance.used}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Carried</p>
                <p className="font-semibold text-gray-900">{selectedBalance.carriedForward}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Available</p>
                <p className="font-semibold text-blue-700">{selectedBalance.balance}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Start Date *</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>End Date *</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isHalfDay"
            checked={isHalfDay}
            onChange={(e) => setIsHalfDay(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="isHalfDay" className="text-sm text-gray-700">
            Half-day leave
          </label>
        </div>

        <div>
          <label className={labelCls}>Reason</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputCls}
            placeholder="Optional reason for leave"
          />
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !balances || balances.length === 0}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
