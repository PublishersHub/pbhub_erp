'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingButton } from '@/components/ui/loading-button';
import { useAsync } from '@/lib/hooks';
import { checkIn, checkOut, getMyToday, getMyPolicy } from '@/lib/attendance-api';
import { listHolidays } from '@/lib/leave-api';
import { gatherCheckInMetadata } from '@/lib/attendance-metadata';
import { formatDateTime } from '@/lib/format';
import { LogMetaChips } from '@/components/attendance/log-meta-chips';
import { OffDayCard, getOffDayInfo } from '@/components/attendance/off-day-card';
import type { AttendancePolicy } from '@/types/attendance';
import type { Holiday } from '@/types/leave';

export default function AttendancePage() {
  useDocumentTitle('Attendance');

  const { data, error, loading, refetch } = useAsync(() => getMyToday(), []);
  const [actionError, setActionError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [policy, setPolicy] = useState<AttendancePolicy | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [override, setOverride] = useState(false);

  // Load effective policy + this year's holidays for off-day banner.
  useEffect(() => {
    void getMyPolicy().then(setPolicy).catch(() => setPolicy(null));
    void listHolidays(new Date().getFullYear())
      .then(setHolidays)
      .catch(() => setHolidays([]));
  }, []);

  // Refetch when the floating Quick Actions widget records a check-in/out.
  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener('attendance:updated', handler);
    return () => window.removeEventListener('attendance:updated', handler);
  }, [refetch]);

  const summary = data?.summary ?? null;
  const allLogs = data?.logs ?? [];
  // Defensive: ignore future-dated logs (e.g. seed data, manual corrections)
  const nowMs = Date.now();
  const logs = allLogs.filter((l) => new Date(l.timestamp).getTime() <= nowMs);

  const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const isCheckedIn = lastLog?.logType === 'CHECK_IN';
  // STRICT MODE: day is complete once a CHECK_OUT is recorded today.
  const dayComplete = logs.some((l) => l.logType === 'CHECK_OUT');

  // Off-day awareness — null policy falls back to Mon-Fri.
  const offDay = useMemo(
    () => getOffDayInfo(policy?.workingDays, holidays),
    [policy?.workingDays, holidays],
  );
  // Banner shows when today is non-working AND user hasn't already begun their day.
  // Day-complete and already-checked-in cases keep their normal UI.
  const showOffDayBanner =
    (!offDay.isWorkingDay || !!offDay.holiday) &&
    !dayComplete &&
    !isCheckedIn &&
    !override;

  async function handleCheckIn() {
    if (submitting) return;
    setActionError('');
    setSubmitting(true);
    try {
      const { meta } = await gatherCheckInMetadata();
      await checkIn({ source: 'WEB', ...meta });
      refetch();
      window.dispatchEvent(new CustomEvent('attendance:updated'));
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
      const { meta } = await gatherCheckInMetadata();
      await checkOut({ source: 'WEB', ...meta });
      refetch();
      window.dispatchEvent(new CustomEvent('attendance:updated'));
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
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft text-center">
          <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Quick Action</h3>
          <p className="mb-2 text-3xl font-bold text-foreground">
            {new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <p className="mb-6 text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>

          {showOffDayBanner ? (
            <OffDayCard
              holiday={offDay.holiday}
              isWorkingDay={offDay.isWorkingDay}
              isCheckedIn={isCheckedIn}
              onOverride={() => setOverride(true)}
            />
          ) : dayComplete ? (
            <div className="rounded-xl border border-hairline bg-muted/40 px-4 py-4 text-left">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/20 text-success">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <p className="text-base font-semibold text-foreground">Day complete</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{formatTime(summary?.firstCheckIn ?? null)}</span> →{' '}
                <span className="font-medium text-foreground">{formatTime(summary?.lastCheckOut ?? null)}</span>
              </p>
              {summary?.totalWorkedMinutes ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{formatMinutes(summary.totalWorkedMinutes)}</span> worked
                </p>
              ) : null}
              <p className="mt-3 text-xs text-muted-foreground">
                Need a correction? Contact HR.
              </p>
            </div>
          ) : isCheckedIn ? (
            <LoadingButton
              onClick={handleCheckOut}
              loading={submitting}
              loadingText="Checking Out..."
              variant="destructive"
              className="w-full !py-3"
            >
              Check Out
            </LoadingButton>
          ) : (
            <LoadingButton
              onClick={handleCheckIn}
              loading={submitting}
              loadingText="Checking In..."
              className="w-full !bg-success !text-success-foreground hover:!bg-success/90 !py-3"
            >
              Check In
            </LoadingButton>
          )}
        </div>

        {/* Today's summary */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Today&apos;s Summary</h3>
          {summary ? (
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Status</dt>
                <dd><StatusBadge status={summary.status} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">First Check-in</dt>
                <dd className="text-sm font-medium text-foreground">{formatTime(summary.firstCheckIn)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Last Check-out</dt>
                <dd className="text-sm font-medium text-foreground">{formatTime(summary.lastCheckOut)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Worked</dt>
                <dd className="text-sm font-medium text-foreground">{formatMinutes(summary.totalWorkedMinutes)}</dd>
              </div>
              {summary.overtimeMinutes > 0 && (
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Overtime</dt>
                  <dd className="text-sm font-medium text-success">{formatMinutes(summary.overtimeMinutes)}</dd>
                </div>
              )}
              {summary.lateMinutes > 0 && (
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Late</dt>
                  <dd className="text-sm font-medium text-destructive">{formatMinutes(summary.lateMinutes)}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No attendance recorded yet today.</p>
          )}
        </div>

        {/* Today's log timeline */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Today&apos;s Logs</h3>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No logs yet.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      log.logType === 'CHECK_IN' ? 'bg-success' : 'bg-destructive'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {log.logType === 'CHECK_IN' ? 'Check In' : 'Check Out'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(log.timestamp)} &middot; {log.source}
                    </p>
                    <LogMetaChips log={log} className="mt-1.5" />
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
