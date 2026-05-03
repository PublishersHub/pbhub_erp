'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/toast';
import { useCommandPalette } from '@/components/command-palette';
import { checkIn, checkOut, getMyToday, getMyPolicy } from '@/lib/attendance-api';
import { gatherCheckInMetadata, metaHasLocation } from '@/lib/attendance-metadata';
import { getPendingApprovals, listHolidays } from '@/lib/leave-api';
import { getPendingClaims } from '@/lib/expense-api';
import { OffDayCard, getOffDayInfo } from '@/components/attendance/off-day-card';
import type { AttendanceLog, AttendanceDailySummary, AttendancePolicy } from '@/types/attendance';
import type { Holiday } from '@/types/leave';

interface TodayState {
  summary: AttendanceDailySummary | null;
  logs: AttendanceLog[];
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(minutes: number): string {
  if (!minutes || minutes < 1) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function liveDuration(firstCheckInIso: string | null, lastLog: AttendanceLog | undefined): number {
  if (!firstCheckInIso) return 0;
  if (lastLog?.logType === 'CHECK_OUT') {
    const total = new Date(lastLog.timestamp).getTime() - new Date(firstCheckInIso).getTime();
    return Math.max(0, total / 60000);
  }
  const total = Date.now() - new Date(firstCheckInIso).getTime();
  return Math.max(0, total / 60000);
}

function hasPermission(perms: string[] | undefined, code: string): boolean {
  if (!perms) return false;
  return perms.includes(code) || perms.includes('*');
}

export function QuickActionsWidget() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { openPalette } = useCommandPalette();

  const [open, setOpen] = useState(false);
  const [today, setToday] = useState<TodayState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingLeave, setPendingLeave] = useState(0);
  const [pendingExpense, setPendingExpense] = useState(0);
  const [actionLoading, setActionLoading] = useState<'in' | 'out' | null>(null);
  const [tick, setTick] = useState(0);
  const [policy, setPolicy] = useState<AttendancePolicy | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [override, setOverride] = useState(false);

  const perms = user?.user?.permissions;
  const canCheckIn = hasPermission(perms, 'attendance.checkin');
  const canApplyLeave = hasPermission(perms, 'leave.request');
  const canApproveLeave = hasPermission(perms, 'leave.approve');
  const canApproveExpense = hasPermission(perms, 'expense.approve');

  const loadToday = useCallback(async () => {
    if (!canCheckIn) { setLoading(false); return; }
    try {
      const data = await getMyToday();
      setToday(data);
    } catch {
      // ignore — widget shows graceful fallback
    } finally {
      setLoading(false);
    }
  }, [canCheckIn]);

  const loadPending = useCallback(async () => {
    const tasks: Promise<void>[] = [];
    if (canApproveLeave) {
      tasks.push(
        getPendingApprovals()
          .then((r) => setPendingLeave(r.length))
          .catch(() => setPendingLeave(0)),
      );
    }
    if (canApproveExpense) {
      tasks.push(
        getPendingClaims()
          .then((r) => setPendingExpense(r.length))
          .catch(() => setPendingExpense(0)),
      );
    }
    await Promise.all(tasks);
  }, [canApproveLeave, canApproveExpense]);

  useEffect(() => {
    void loadToday();
    void loadPending();
  }, [loadToday, loadPending]);

  // Load effective policy + this year's holidays so we can render the off-day banner.
  // Both calls fail gracefully — null policy → assume Mon-Fri, empty holidays → no holiday match.
  useEffect(() => {
    if (!canCheckIn) return;
    void getMyPolicy().then(setPolicy).catch(() => setPolicy(null));
    void listHolidays(new Date().getFullYear())
      .then(setHolidays)
      .catch(() => setHolidays([]));
  }, [canCheckIn]);

  // Tick every minute so the live duration stays current while panel open
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, [open]);

  // Filter out future-dated logs (defensive against seed data or manual corrections)
  const pastLogs = useMemo(() => {
    if (!today?.logs) return [];
    const nowMs = Date.now();
    return today.logs.filter((l) => new Date(l.timestamp).getTime() <= nowMs);
  }, [today?.logs]);
  const lastLog = pastLogs[pastLogs.length - 1];
  const isCheckedIn = lastLog?.logType === 'CHECK_IN';
  // STRICT MODE: day is complete once a CHECK_OUT has been recorded today.
  const dayComplete = pastLogs.some((l) => l.logType === 'CHECK_OUT');

  // Working-day / holiday awareness — null policy falls back to Mon-Fri.
  const offDay = useMemo(
    () => getOffDayInfo(policy?.workingDays, holidays),
    [policy?.workingDays, holidays],
  );
  // Show banner only when nothing has been logged yet today and the user hasn't opted in.
  const showOffDayBanner =
    (!offDay.isWorkingDay || !!offDay.holiday) &&
    !dayComplete &&
    !isCheckedIn &&
    !override;
  const firstCheckIn = today?.summary?.firstCheckIn ?? pastLogs.find((l) => l.logType === 'CHECK_IN')?.timestamp ?? null;
  const lastCheckOut = today?.summary?.lastCheckOut ?? [...pastLogs].reverse().find((l) => l.logType === 'CHECK_OUT')?.timestamp ?? null;

  const liveMinutes = useMemo(() => {
    void tick;
    return liveDuration(firstCheckIn, lastLog);
  }, [firstCheckIn, lastLog, tick]);

  const onCheckIn = async () => {
    setActionLoading('in');
    try {
      const meta = await gatherCheckInMetadata();
      await checkIn(meta);
      const recordedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (metaHasLocation(meta)) {
        success('Checked in', `Welcome — recorded at ${recordedAt}.`);
      } else {
        success('Checked in', 'Location not shared');
      }
      await loadToday();
    } catch (e) {
      error('Check-in failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const onCheckOut = async () => {
    setActionLoading('out');
    try {
      const meta = await gatherCheckInMetadata();
      await checkOut(meta);
      if (metaHasLocation(meta)) {
        success('Checked out', `Have a good evening — ${formatDuration(liveMinutes)} worked today.`);
      } else {
        success('Checked out', 'Location not shared');
      }
      await loadToday();
    } catch (e) {
      error('Check-out failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) return null;

  // Don't render if user has none of the relevant permissions
  if (!canCheckIn && !canApplyLeave && !canApproveLeave && !canApproveExpense) return null;

  const totalPending = pendingLeave + pendingExpense;

  return (
    <div className="fixed bottom-4 right-4 z-40 print:hidden">
      {open ? (
        <div className="motion-scale-in w-[320px] rounded-2xl border border-hairline bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today</p>
              <p className="text-sm font-semibold text-foreground">
                {new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              aria-label="Close quick actions"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {canCheckIn && (
            <div className="border-b border-hairline px-4 py-4">
              {loading ? (
                <div className="h-20 animate-pulse rounded-lg bg-muted" />
              ) : showOffDayBanner ? (
                <OffDayCard
                  holiday={offDay.holiday}
                  isWorkingDay={offDay.isWorkingDay}
                  isCheckedIn={isCheckedIn}
                  onOverride={() => setOverride(true)}
                />
              ) : dayComplete ? (
                <div className="rounded-xl border border-hairline bg-muted/40 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/20 text-success">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <p className="text-sm font-semibold text-foreground">Day complete</p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{formatTime(firstCheckIn)}</span> →{' '}
                    <span className="font-medium text-foreground">{formatTime(lastCheckOut)}</span>
                    {' · '}
                    <span className="font-medium text-foreground">{formatDuration(liveMinutes)} worked</span>
                  </p>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Need a correction? Contact HR.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <span className={`h-2 w-2 rounded-full ${isCheckedIn ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
                        {isCheckedIn ? 'Working' : 'Not started'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{firstCheckIn ? 'Worked' : 'In'}</p>
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        {firstCheckIn ? formatDuration(liveMinutes) : formatTime(null)}
                      </p>
                    </div>
                  </div>

                  {firstCheckIn && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      Started at <span className="font-medium text-foreground">{formatTime(firstCheckIn)}</span>
                    </p>
                  )}

                  {isCheckedIn ? (
                    <button
                      onClick={onCheckOut}
                      disabled={actionLoading !== null}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground motion-press hover:bg-destructive/90 disabled:opacity-60"
                    >
                      {actionLoading === 'out' ? (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      )}
                      {actionLoading === 'out' ? 'Locating…' : 'Check out'}
                    </button>
                  ) : (
                    <button
                      onClick={onCheckIn}
                      disabled={actionLoading !== null}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow-primary motion-press hover:bg-primary/90 disabled:opacity-60"
                    >
                      {actionLoading === 'in' ? (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      )}
                      {actionLoading === 'in' ? 'Locating…' : 'Check in'}
                    </button>
                  )}
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Location helps your manager verify on-site work
                  </p>
                </>
              )}
            </div>
          )}

          <div className="space-y-1 px-2 py-2">
            {canApplyLeave && (
              <Link
                href="/leave/apply"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-muted"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet/10 text-violet">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <span className="flex-1">Apply for leave</span>
              </Link>
            )}

            {(canApproveLeave || canApproveExpense) && (
              <Link
                href="/inbox"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-muted"
              >
                <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  {totalPending > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {totalPending}
                    </span>
                  )}
                </span>
                <span className="flex-1">Approval inbox</span>
                {totalPending > 0 && (
                  <span className="text-xs text-muted-foreground">{totalPending} pending</span>
                )}
              </Link>
            )}

            <button
              type="button"
              onClick={() => { setOpen(false); openPalette(); }}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-muted"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <span className="flex-1 text-left">Search…</span>
              <kbd className="rounded border border-hairline bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open quick actions"
          className="motion-press group relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow-primary hover:bg-primary/90"
        >
          {isCheckedIn && (
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-success">
              <span className="block h-full w-full animate-ping rounded-full bg-success opacity-75" />
            </span>
          )}
          {totalPending > 0 && !isCheckedIn && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-card bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
              {totalPending}
            </span>
          )}
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
      )}
    </div>
  );
}
