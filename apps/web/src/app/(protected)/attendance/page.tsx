'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAsync } from '@/lib/hooks';
import { checkIn, checkOut, getMyToday } from '@/lib/attendance-api';
import { formatDateTime } from '@/lib/format';

export default function AttendancePage() {
  const { data, error, loading, refetch } = useAsync(() => getMyToday(), []);
  const [actionError, setActionError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const summary = data?.summary ?? null;
  const logs = data?.logs ?? [];

  const hasCheckedIn = logs.some((l) => l.logType === 'CHECK_IN');
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const isCheckedIn = lastLog?.logType === 'CHECK_IN';

  async function handleCheckIn() {
    if (submitting) return;
    setActionError('');
    setSubmitting(true);
    try {
      await checkIn({ source: 'WEB' });
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut() {
    if (submitting) return;
    setActionError('');
    setSubmitting(true);
    try {
      await checkOut({ source: 'WEB' });
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Check-out failed');
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(ts: string | null) {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatMinutes(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader title="Attendance" description="Check in and out, view today's status" />

      {actionError && (
        <div className="mb-4">
          <ErrorMessage message={actionError} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Check-in / Check-out card */}
        <div className="rounded-lg border bg-white p-6 shadow-sm text-center">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Quick Action</h3>
          <p className="mb-2 text-3xl font-bold text-gray-900">
            {new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <p className="mb-6 text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>

          {!hasCheckedIn ? (
            <button
              onClick={handleCheckIn}
              disabled={submitting}
              className="w-full rounded-md bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Checking In...' : 'Check In'}
            </button>
          ) : isCheckedIn ? (
            <button
              onClick={handleCheckOut}
              disabled={submitting}
              className="w-full rounded-md bg-red-600 px-6 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? 'Checking Out...' : 'Check Out'}
            </button>
          ) : (
            <button
              onClick={handleCheckIn}
              disabled={submitting}
              className="w-full rounded-md bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Checking In...' : 'Check In Again'}
            </button>
          )}
        </div>

        {/* Today's summary */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Today&apos;s Summary</h3>
          {summary ? (
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Status</dt>
                <dd><StatusBadge status={summary.status} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">First Check-in</dt>
                <dd className="text-sm font-medium text-gray-900">{formatTime(summary.firstCheckIn)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Last Check-out</dt>
                <dd className="text-sm font-medium text-gray-900">{formatTime(summary.lastCheckOut)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Worked</dt>
                <dd className="text-sm font-medium text-gray-900">{formatMinutes(summary.totalWorkedMinutes)}</dd>
              </div>
              {summary.overtimeMinutes > 0 && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Overtime</dt>
                  <dd className="text-sm font-medium text-green-700">{formatMinutes(summary.overtimeMinutes)}</dd>
                </div>
              )}
              {summary.lateMinutes > 0 && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Late</dt>
                  <dd className="text-sm font-medium text-red-600">{formatMinutes(summary.lateMinutes)}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-gray-500">No attendance recorded yet today.</p>
          )}
        </div>

        {/* Today's log timeline */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Today&apos;s Logs</h3>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500">No logs yet.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      log.logType === 'CHECK_IN' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {log.logType === 'CHECK_IN' ? 'Check In' : 'Check Out'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(log.timestamp)} &middot; {log.source}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
