'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import { listEmployees } from '@/lib/employee-api';
import { getTodayReport, getMyToday, checkIn, checkOut, getAllSummaries } from '@/lib/attendance-api';
import {
  getAllLeaveRequests,
  getMyLeaveRequests,
  getMyBalances,
  getPendingApprovals,
  listHolidays,
} from '@/lib/leave-api';
import { getAllClaims, getPendingClaims, getMyClaims } from '@/lib/expense-api';
import { listInstances, getMyInstance } from '@/lib/onboarding-api';
import { getDashboardSummary } from '@/lib/recruitment-api';
import { formatDate, formatDateTime, formatCurrency, employeeName } from '@/lib/format';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Sparkline } from '@/components/ui/sparkline';

// ─── Helpers ────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

// Synthetic series — replace with real historical data when a backend endpoint is available.
function fakeTrend(current: number, days = 7): number[] {
  const out: number[] = [];
  let v = Math.max(0, current * 0.7);
  const step = (current - v) / (days - 1);
  for (let i = 0; i < days; i++) {
    const noise = (Math.random() - 0.5) * Math.max(1, current * 0.15);
    out.push(Math.max(0, Math.round(v + noise)));
    v += step;
  }
  out[out.length - 1] = current;
  return out;
}

function safe<T>(fn: () => Promise<T>): () => Promise<T | null> {
  return () => fn().catch(() => null);
}

// ─── Tiny inline icons ──────────────────────

const I = {
  Users: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  CheckCircle: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Plane: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  ),
  Bell: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  Briefcase: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.073a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-4.072m16.5 0a24.301 24.301 0 01-4.5.892m4.5-.892l-.834-3.32a4.5 4.5 0 00-4.282-3.405h-2.268a4.5 4.5 0 00-4.282 3.405l-.834 3.32m16.5 0a24.301 24.301 0 01-4.5.892m0 0v-4.572m0 4.572a23.999 23.999 0 01-7.5 0m7.5 0v-4.572m-7.5 4.572V14.15m0 4.572a23.999 23.999 0 01-7.5 0m0 0V14.15m7.5 4.572V14.15M14.25 9h-4.5m4.5 0v-1.5a2.25 2.25 0 00-2.25-2.25h0a2.25 2.25 0 00-2.25 2.25V9" />
    </svg>
  ),
  Receipt: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 3h6m-6 3h6M5.25 4.5a2.25 2.25 0 012.25-2.25h9a2.25 2.25 0 012.25 2.25V21l-4.5-1.5L9 21l-3-1.5L5.25 21V4.5z" />
    </svg>
  ),
  Calendar: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  Clock: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Rocket: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  ),
  CurrencyDollar: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ChartBar: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  Person: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
};

// ─── Initials helper ─────────────────────────

function initials(first?: string, last?: string) {
  return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || '?';
}

// ─── Building-block components ──────────────

function KpiCard({
  label,
  value,
  hint,
  href,
  accent = 'primary',
  icon,
  loading,
  trend,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href: string;
  accent?: 'primary' | 'violet' | 'pink' | 'cyan' | 'success' | 'warning';
  icon: JSX.Element;
  loading?: boolean;
  trend?: number[];
}) {
  const accentClass = {
    primary: 'from-primary/30 to-primary/0',
    violet: 'from-violet/30 to-violet/0',
    pink: 'from-pink/30 to-pink/0',
    cyan: 'from-cyan/30 to-cyan/0',
    success: 'from-success/30 to-success/0',
    warning: 'from-warning/30 to-warning/0',
  }[accent];
  const iconBg = {
    primary: 'bg-primary/15 text-primary',
    violet: 'bg-violet/15 text-violet',
    pink: 'bg-pink/15 text-pink',
    cyan: 'bg-cyan/15 text-cyan',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
  }[accent];
  const trendColorClass = {
    primary: 'text-primary',
    violet: 'text-violet',
    pink: 'text-pink',
    cyan: 'text-cyan',
    success: 'text-success',
    warning: 'text-warning',
  }[accent];

  return (
    <Link
      href={href}
      className="surface-elevated motion-lift relative overflow-hidden rounded-2xl border border-hairline p-5 transition-all duration-300 hover:border-primary/30"
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${accentClass} blur-2xl`}
      />
      <div className="relative flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {loading ? <span className="inline-block h-8 w-12 animate-pulse rounded bg-muted" /> : value}
          </span>
          {hint && <span className="text-xs text-muted-foreground/80">{hint}</span>}
          {trend && trend.length >= 2 && (
            <div className="mt-2">
              <Sparkline data={trend} className={trendColorClass} width={120} height={28} smooth fill="none" />
            </div>
          )}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
      </div>
    </Link>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  viewAllHref,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  viewAllHref?: string;
}) {
  return (
    <div className="surface-glass-card rounded-2xl border border-hairline p-5 shadow-soft">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="group inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            View all
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-3 w-3 transition-transform group-hover:translate-x-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function PulsePill({
  icon,
  label,
  value,
  accent,
}: {
  icon: JSX.Element;
  label: string;
  value: number;
  accent: 'success' | 'warning' | 'violet' | 'pink';
}) {
  const cls = {
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    violet: 'bg-violet/10 text-violet',
    pink: 'bg-pink/10 text-pink',
  }[accent];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-hairline bg-card/40 p-3 backdrop-blur">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cls}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-xl font-semibold text-foreground tabular-nums">{value}</p>
      </div>
    </div>
  );
}

// ─── Relative time helper ────────────────────

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

// ─── Attendance Heatmap ──────────────────────

function AttendanceHeatmap({ activeEmployees }: { activeEmployees: number }) {
  const now = new Date();
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - 29);
  const fromStr = fromDate.toISOString().slice(0, 10);
  const toStr = now.toISOString().slice(0, 10);

  const summaries = useAsync(safe(() => getAllSummaries({ from: fromStr, to: toStr })), []);

  // Build array of the past 30 days
  const days = useMemo(() => {
    const result: { date: string; presentCount: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      result.push({ date: d.toISOString().slice(0, 10), presentCount: 0 });
    }
    if (summaries.data) {
      const byDate: Record<string, number> = {};
      for (const s of summaries.data) {
        if (s.status === 'PRESENT' || s.status === 'LATE' || s.status === 'HALF_DAY') {
          byDate[s.date] = (byDate[s.date] ?? 0) + 1;
        }
      }
      for (const day of result) {
        day.presentCount = byDate[day.date] ?? 0;
      }
    }
    return result;
  }, [summaries.data]);

  function cellColor(count: number): string {
    if (count === 0 || activeEmployees === 0) return 'bg-muted';
    const pct = count / activeEmployees;
    if (pct < 0.25) return 'bg-primary/30';
    if (pct < 0.6) return 'bg-primary/60';
    return 'bg-primary';
  }

  const isEmpty = !summaries.loading && (!summaries.data || summaries.data.length === 0);

  // Arrange 30 days into 6 cols × 5 rows
  const cols = 6;
  const rows = 5;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Attendance over the past 30 days</span>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Less</span>
          {['bg-muted', 'bg-primary/30', 'bg-primary/60', 'bg-primary'].map((cls) => (
            <span key={cls} className={`inline-block h-3 w-3 rounded-sm ${cls}`} />
          ))}
          <span>More</span>
        </div>
      </div>
      {summaries.loading ? (
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="h-4 w-4 animate-pulse rounded-sm bg-muted/60" />
          ))}
        </div>
      ) : isEmpty ? (
        <p className="text-xs text-muted-foreground">No attendance data yet for this window.</p>
      ) : (
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
        >
          {days.map((day) => (
            <div
              key={day.date}
              className={`group relative h-4 w-4 rounded-sm transition-opacity hover:opacity-80 ${cellColor(day.presentCount)}`}
              title={`${day.date}: ${day.presentCount} present`}
            >
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded bg-popover px-2 py-1 text-[10px] whitespace-nowrap text-popover-foreground shadow-md ring-1 ring-border group-hover:block">
                {day.date} · {day.presentCount} present
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Activity Feed ───────────────────────────

interface ActivityEvent {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  subtitle?: string;
  href?: string;
  variant: 'leave' | 'expense' | 'onboarding';
}

const ActivityIcon = {
  leave: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  ),
  expense: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 3h6m-6 3h6M5.25 4.5a2.25 2.25 0 012.25-2.25h9a2.25 2.25 0 012.25 2.25V21l-4.5-1.5L9 21l-3-1.5L5.25 21V4.5z" />
    </svg>
  ),
  onboarding: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  ),
};

const variantIconBg: Record<ActivityEvent['variant'], string> = {
  leave: 'bg-violet/15 text-violet',
  expense: 'bg-pink/15 text-pink',
  onboarding: 'bg-cyan/15 text-cyan',
};

function ActivityFeed() {
  const allLeaves = useAsync(safe(() => getAllLeaveRequests()), []);
  const allClaims = useAsync(safe(() => getAllClaims()), []);
  const allInstances = useAsync(safe(() => listInstances({})), []);

  const events = useMemo<ActivityEvent[]>(() => {
    const out: ActivityEvent[] = [];

    // Leave events
    for (const lr of allLeaves.data ?? []) {
      out.push({
        id: `leave-submitted-${lr.id}`,
        timestamp: lr.submittedAt,
        type: 'leave.submitted',
        title: `${employeeName(lr.employee)} submitted a leave request`,
        subtitle: `${lr.totalDays}d · ${lr.leavePolicy?.name ?? 'Leave'}`,
        href: `/leave/requests/${lr.id}`,
        variant: 'leave',
      });
      if ((lr.status === 'APPROVED' || lr.status === 'REJECTED') && lr.finalDecisionAt) {
        out.push({
          id: `leave-${lr.status.toLowerCase()}-${lr.id}`,
          timestamp: lr.finalDecisionAt,
          type: `leave.${lr.status.toLowerCase()}`,
          title: `${employeeName(lr.employee)}'s leave was ${lr.status.toLowerCase()}`,
          subtitle: `${lr.totalDays}d · ${lr.leavePolicy?.name ?? 'Leave'}`,
          href: `/leave/requests/${lr.id}`,
          variant: 'leave',
        });
      }
    }

    // Expense events
    for (const c of allClaims.data ?? []) {
      if (c.submittedAt) {
        out.push({
          id: `expense-submitted-${c.id}`,
          timestamp: c.submittedAt,
          type: 'expense.submitted',
          title: `${employeeName(c.employee)} submitted an expense claim`,
          subtitle: `${c.title} · ${formatCurrency(c.totalAmount)}`,
          href: `/expenses/claims/${c.id}`,
          variant: 'expense',
        });
      }
      if (c.status === 'REIMBURSED' && c.reimbursedAt) {
        out.push({
          id: `expense-reimbursed-${c.id}`,
          timestamp: c.reimbursedAt,
          type: 'expense.reimbursed',
          title: `${employeeName(c.employee)}'s expense was reimbursed`,
          subtitle: `${c.title} · ${formatCurrency(c.totalAmount)}`,
          href: `/expenses/claims/${c.id}`,
          variant: 'expense',
        });
      }
      if (c.status === 'REJECTED' && c.finalDecisionAt) {
        out.push({
          id: `expense-rejected-${c.id}`,
          timestamp: c.finalDecisionAt,
          type: 'expense.rejected',
          title: `${employeeName(c.employee)}'s expense was rejected`,
          subtitle: `${c.title} · ${formatCurrency(c.totalAmount)}`,
          href: `/expenses/claims/${c.id}`,
          variant: 'expense',
        });
      }
    }

    // Onboarding events
    for (const inst of (allInstances.data ?? []) as any[]) {
      const startTs = inst.startedAt ?? inst.createdAt;
      if (startTs) {
        out.push({
          id: `onboarding-started-${inst.id}`,
          timestamp: startTs,
          type: 'onboarding.started',
          title: `${employeeName(inst.employee)} started onboarding`,
          subtitle: `Joined ${formatDate(inst.joiningDate)}`,
          href: `/onboarding/${inst.id}`,
          variant: 'onboarding',
        });
      }
      if (inst.status === 'COMPLETED' && inst.completedAt) {
        out.push({
          id: `onboarding-completed-${inst.id}`,
          timestamp: inst.completedAt,
          type: 'onboarding.completed',
          title: `${employeeName(inst.employee)} completed onboarding`,
          subtitle: `Joined ${formatDate(inst.joiningDate)}`,
          href: `/onboarding/${inst.id}`,
          variant: 'onboarding',
        });
      }
    }

    return out.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
  }, [allLeaves.data, allClaims.data, allInstances.data]);

  const isLoading = allLeaves.loading || allClaims.loading || allInstances.loading;

  return (
    <div>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-lg bg-muted/60" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted/60" />
                <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted/40" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState title="No recent activity" description="Events from leave, expenses, and onboarding will appear here." />
      ) : (
        <div className="-mx-2 space-y-0.5">
          {events.map((ev) => (
            ev.href ? (
              <Link
                key={ev.id}
                href={ev.href}
                className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${variantIconBg[ev.variant]}`}>
                    {ActivityIcon[ev.variant]}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{ev.title}</p>
                    {ev.subtitle && (
                      <p className="truncate text-xs text-muted-foreground">{ev.subtitle}</p>
                    )}
                  </div>
                </div>
                <span className="ml-3 shrink-0 text-xs text-muted-foreground tabular-nums">
                  {relativeTime(ev.timestamp)}
                </span>
              </Link>
            ) : (
              <div
                key={ev.id}
                className="flex items-center justify-between rounded-xl px-2 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${variantIconBg[ev.variant]}`}>
                    {ActivityIcon[ev.variant]}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{ev.title}</p>
                    {ev.subtitle && (
                      <p className="truncate text-xs text-muted-foreground">{ev.subtitle}</p>
                    )}
                  </div>
                </div>
                <span className="ml-3 shrink-0 text-xs text-muted-foreground tabular-nums">
                  {relativeTime(ev.timestamp)}
                </span>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Role variant picker ─────────────────────

type DashVariant = 'company' | 'finance' | 'recruiter' | 'manager' | 'employee';

function pickVariant(roles: string[]): DashVariant {
  if (roles.includes('super_admin') || roles.includes('hr_admin')) return 'company';
  if (roles.includes('finance_admin')) return 'finance';
  if (roles.includes('recruiter')) return 'recruiter';
  if (roles.includes('manager')) return 'manager';
  return 'employee';
}

// ─── Company Dashboard (existing, verbatim) ──

function CompanyDashboard() {
  const todayStr = today();
  const year = new Date().getUTCFullYear();

  const employees = useAsync(safe(() => listEmployees()), []);
  const todayAttendance = useAsync(safe(() => getTodayReport()), []);
  const pendingLeaves = useAsync(safe(() => getAllLeaveRequests('PENDING')), []);
  const approvedLeaves = useAsync(safe(() => getAllLeaveRequests('APPROVED')), []);
  const pendingClaims = useAsync(safe(() => getAllClaims('SUBMITTED')), []);
  const onboardings = useAsync(safe(() => listInstances({ status: 'IN_PROGRESS' })), []);
  const recruitment = useAsync(safe(() => getDashboardSummary()), []);
  const holidays = useAsync(safe(() => listHolidays(year)), []);

  const activeEmployees = employees.data?.filter((e) => e.isActive).length ?? 0;
  const present = todayAttendance.data?.present ?? 0;
  const onLeaveToday = todayAttendance.data?.onLeave ?? 0;
  const lateToday = todayAttendance.data?.late ?? 0;
  const absentToday = todayAttendance.data?.absent ?? 0;
  const totalAttendanceTracked =
    (todayAttendance.data?.present ?? 0) +
    (todayAttendance.data?.late ?? 0) +
    (todayAttendance.data?.halfDay ?? 0);
  const attendancePct =
    activeEmployees > 0 ? Math.round((totalAttendanceTracked / activeEmployees) * 100) : 0;

  const pendingLeavesCount = pendingLeaves.data?.length ?? 0;
  const pendingClaimsCount = pendingClaims.data?.length ?? 0;
  const totalPendingApprovals = pendingLeavesCount + pendingClaimsCount;

  const todaysApprovedLeaves =
    approvedLeaves.data?.filter(
      (lr) => lr.startDate <= todayStr && lr.endDate >= todayStr,
    ) ?? [];

  const upcomingHolidays =
    holidays.data
      ?.filter((h) => {
        if (!h.isActive) return false;
        const d = new Date(h.date);
        const now = new Date();
        const in30 = new Date();
        in30.setDate(in30.getDate() + 30);
        return d >= now && d <= in30;
      })
      .slice(0, 4) ?? [];

  const openPositions = 0; // openRequisitions not in DashboardSummary; use /recruitment/requisitions for full count
  const upcomingInterviews = recruitment.data?.upcomingInterviews ?? [];

  // Synthetic trend series — stable per value change via useMemo
  const trendActiveEmployees = useMemo(() => fakeTrend(activeEmployees), [activeEmployees]);
  const trendPresent = useMemo(() => fakeTrend(present), [present]);
  const trendOnLeave = useMemo(() => fakeTrend(onLeaveToday), [onLeaveToday]);
  const trendPendingApprovals = useMemo(() => fakeTrend(totalPendingApprovals), [totalPendingApprovals]);
  const trendOpenPositions = useMemo(() => fakeTrend(openPositions), [openPositions]);

  return (
    <div className="space-y-6">
      {/* Top KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Active Employees"
          value={activeEmployees}
          hint={employees.data ? `${employees.data.length} total` : undefined}
          href="/employees"
          accent="primary"
          icon={I.Users}
          loading={employees.loading}
          trend={trendActiveEmployees}
        />
        <KpiCard
          label="Present Today"
          value={present}
          hint={activeEmployees > 0 ? `${attendancePct}% of active` : undefined}
          href="/attendance/daily"
          accent="success"
          icon={I.CheckCircle}
          loading={todayAttendance.loading}
          trend={trendPresent}
        />
        <KpiCard
          label="On Leave Today"
          value={onLeaveToday}
          hint={lateToday > 0 ? `${lateToday} late` : undefined}
          href="/leave/requests?status=APPROVED"
          accent="violet"
          icon={I.Plane}
          loading={todayAttendance.loading}
          trend={trendOnLeave}
        />
        <KpiCard
          label="Pending Approvals"
          value={totalPendingApprovals}
          hint={`${pendingLeavesCount} leave · ${pendingClaimsCount} expense`}
          href="/leave/requests?view=pending"
          accent="warning"
          icon={I.Bell}
          loading={pendingLeaves.loading || pendingClaims.loading}
          trend={trendPendingApprovals}
        />
        <KpiCard
          label="Open Positions"
          value={openPositions}
          hint={recruitment.data ? `${recruitment.data.activeApplications} applications` : undefined}
          href="/recruitment/requisitions"
          accent="cyan"
          icon={I.Briefcase}
          loading={recruitment.loading}
          trend={trendOpenPositions}
        />
      </div>

      {/* Today's attendance pulse */}
      <SectionCard
        title="Today at a glance"
        subtitle="Live attendance pulse across the company"
        viewAllHref="/attendance/daily"
      >
        {todayAttendance.loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <PulsePill icon={I.CheckCircle} label="Present" value={present} accent="success" />
              <PulsePill icon={I.Clock} label="Late" value={lateToday} accent="warning" />
              <PulsePill icon={I.Plane} label="On leave" value={onLeaveToday} accent="violet" />
              <PulsePill icon={I.Users} label="Absent" value={absentToday} accent="pink" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Attendance rate</span>
                <span className="font-medium tabular-nums text-foreground">{attendancePct}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary/60 ring-1 ring-inset ring-border/40">
                <div
                  className="gradient-brand h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${attendancePct}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Attendance heatmap */}
      <SectionCard title="Attendance heatmap" subtitle="Past 30 days">
        <AttendanceHeatmap activeEmployees={activeEmployees} />
      </SectionCard>

      {/* Pending approvals + Who's on leave */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Pending approvals"
          subtitle={
            totalPendingApprovals > 0
              ? `${totalPendingApprovals} awaiting your action`
              : 'Nothing waiting'
          }
        >
          {totalPendingApprovals === 0 ? (
            <EmptyState
              title="All caught up"
              description="Leave and expense approvals will appear here when submitted."
            />
          ) : (
            <div className="-mx-2 space-y-1">
              {(pendingLeaves.data ?? []).slice(0, 3).map((lr) => (
                <Link
                  key={lr.id}
                  href={`/leave/requests/${lr.id}`}
                  className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet/15 text-violet">
                      {I.Plane}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {employeeName(lr.employee)} · Leave
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lr.leavePolicy?.name} · {formatDate(lr.startDate)}
                        {lr.startDate !== lr.endDate && ` → ${formatDate(lr.endDate)}`}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
                    {lr.totalDays}d
                  </span>
                </Link>
              ))}
              {(pendingClaims.data ?? []).slice(0, 3).map((c) => (
                <Link
                  key={c.id}
                  href={`/expenses/claims/${c.id}`}
                  className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pink/15 text-pink">
                      {I.Receipt}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {employeeName(c.employee)} · Expense
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.title} · {c.claimNumber}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatCurrency(c.totalAmount)}
                  </span>
                </Link>
              ))}
              {totalPendingApprovals > 6 && (
                <div className="px-2 pt-2 text-xs text-muted-foreground">
                  + {totalPendingApprovals - 6} more
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Out today"
          subtitle={
            todaysApprovedLeaves.length > 0
              ? `${todaysApprovedLeaves.length} on approved leave`
              : 'Everyone is in'
          }
          viewAllHref="/leave/requests?status=APPROVED"
        >
          {todaysApprovedLeaves.length === 0 ? (
            <EmptyState title="Nobody is out today" description="Approved leaves covering today will show up here." />
          ) : (
            <div className="-mx-2 space-y-1">
              {todaysApprovedLeaves.slice(0, 5).map((lr) => (
                <Link
                  key={lr.id}
                  href={`/leave/requests/${lr.id}`}
                  className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="gradient-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white shadow-sm">
                      {initials(lr.employee?.firstName, lr.employee?.lastName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {employeeName(lr.employee)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lr.leavePolicy?.name} · until {formatDate(lr.endDate)}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-violet/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet">
                    {lr.totalDays}d
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Active onboardings + Upcoming interviews */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="New hires onboarding"
          subtitle="In-progress onboarding instances"
          viewAllHref="/onboarding"
        >
          {(onboardings.data ?? []).length === 0 ? (
            <EmptyState
              title="No active onboarding"
              description="New hires entering onboarding will appear here."
            />
          ) : (
            <div className="-mx-2 space-y-1">
              {onboardings.data!.slice(0, 4).map((inst: any) => {
                const totalTasks = inst._count?.tasks ?? 0;
                return (
                  <Link
                    key={inst.id}
                    href={`/onboarding/${inst.id}`}
                    className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan/15 text-cyan">
                        {I.Rocket}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {employeeName(inst.employee)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          Joined {formatDate(inst.joiningDate)} · {totalTasks} tasks
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={inst.status} />
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Upcoming interviews"
          subtitle="Scheduled this week"
          viewAllHref="/recruitment/interviews"
        >
          {upcomingInterviews.length === 0 ? (
            <EmptyState
              title="No upcoming interviews"
              description="Scheduled interviews will appear here."
            />
          ) : (
            <div className="-mx-2 space-y-1">
              {upcomingInterviews.slice(0, 4).map((iv: any) => (
                <Link
                  key={iv.id}
                  href={`/recruitment/applications/${iv.applicationId}`}
                  className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      {I.Calendar}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {employeeName(iv.application.candidate)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {iv.type.replace(/_/g, ' ')} · {formatDateTime(iv.scheduledAt)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={iv.status} />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Upcoming holidays */}
      <SectionCard
        title="Upcoming holidays"
        subtitle="Next 30 days"
        viewAllHref="/leave/holidays"
      >
        {upcomingHolidays.length === 0 ? (
          <EmptyState
            title="No holidays in the next 30 days"
            description="Holidays added by HR will appear here."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {upcomingHolidays.map((h) => {
              const d = new Date(h.date);
              const day = d.getUTCDate();
              const month = d.toLocaleDateString(undefined, { month: 'short' });
              const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
              return (
                <div
                  key={h.id}
                  className="flex items-center gap-3 rounded-xl border border-hairline bg-card/40 p-3 backdrop-blur"
                >
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-[10px] font-semibold uppercase tracking-wide leading-none">
                      {month}
                    </span>
                    <span className="text-lg font-bold leading-none">{day}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{h.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {weekday}
                      {h.isOptional && ' · optional'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Activity feed */}
      <SectionCard title="Activity" subtitle="Recent events across the company">
        <ActivityFeed />
      </SectionCard>
    </div>
  );
}

// ─── Finance Dashboard ───────────────────────

function FinanceDashboard() {
  const employees = useAsync(safe(() => listEmployees()), []);
  const submittedClaims = useAsync(safe(() => getAllClaims('SUBMITTED')), []);
  const managerApprovedClaims = useAsync(safe(() => getAllClaims('MANAGER_APPROVED')), []);
  const financeApprovedClaims = useAsync(safe(() => getAllClaims('FINANCE_APPROVED')), []);
  const reimbursedClaims = useAsync(safe(() => getAllClaims('REIMBURSED')), []);

  const activeEmployees = employees.data?.filter((e) => e.isActive).length ?? 0;
  const pendingFinanceCount =
    (submittedClaims.data?.length ?? 0) + (managerApprovedClaims.data?.length ?? 0);
  const awaitingReimbursement = financeApprovedClaims.data?.length ?? 0;

  const now = new Date();
  const reimbursedThisMonth =
    reimbursedClaims.data?.filter((c) => {
      if (!c.reimbursedAt) return false;
      const d = new Date(c.reimbursedAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }) ?? [];

  const pendingForFinance = [
    ...(submittedClaims.data ?? []),
    ...(managerApprovedClaims.data ?? []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const recentReimbursements = [...(reimbursedClaims.data ?? [])]
    .sort((a, b) => new Date(b.reimbursedAt ?? 0).getTime() - new Date(a.reimbursedAt ?? 0).getTime())
    .slice(0, 5);

  const claimsLoading =
    submittedClaims.loading || managerApprovedClaims.loading || financeApprovedClaims.loading || reimbursedClaims.loading;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Active Employees"
          value={activeEmployees}
          hint="total headcount"
          href="/employees"
          accent="primary"
          icon={I.Users}
          loading={employees.loading}
        />
        <KpiCard
          label="Pending Approval"
          value={pendingFinanceCount}
          hint="submitted + mgr approved"
          href="/expenses/claims"
          accent="warning"
          icon={I.Bell}
          loading={claimsLoading}
        />
        <KpiCard
          label="Awaiting Reimbursement"
          value={awaitingReimbursement}
          hint="finance approved"
          href="/expenses/claims"
          accent="violet"
          icon={I.Receipt}
          loading={financeApprovedClaims.loading}
        />
        <KpiCard
          label="Reimbursed This Month"
          value={reimbursedThisMonth.length}
          hint={
            reimbursedThisMonth.length > 0
              ? formatCurrency(reimbursedThisMonth.reduce((s, c) => s + parseFloat(c.totalAmount ?? '0'), 0))
              : undefined
          }
          href="/expenses/claims"
          accent="success"
          icon={I.CheckCircle}
          loading={reimbursedClaims.loading}
        />
        <KpiCard
          label="Active Salary Structures"
          value={activeEmployees}
          hint="manage payroll"
          href="/payroll/structures"
          accent="cyan"
          icon={I.CurrencyDollar}
          loading={employees.loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Pending expense approvals"
          subtitle={pendingFinanceCount > 0 ? `${pendingFinanceCount} awaiting finance review` : 'Nothing pending'}
          viewAllHref="/expenses/claims"
        >
          {pendingForFinance.length === 0 ? (
            <EmptyState title="All clear" description="Claims submitted or manager-approved will appear here." />
          ) : (
            <div className="-mx-2 space-y-1">
              {pendingForFinance.slice(0, 6).map((c) => (
                <Link
                  key={c.id}
                  href={`/expenses/claims/${c.id}`}
                  className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="gradient-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white shadow-sm">
                      {initials(c.employee?.firstName, c.employee?.lastName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {employeeName(c.employee)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.title} · {c.claimNumber}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {formatCurrency(c.totalAmount)}
                    </span>
                    <StatusBadge status={c.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Recent reimbursements"
          subtitle="Last 5 reimbursed claims"
          viewAllHref="/expenses/claims"
        >
          {recentReimbursements.length === 0 ? (
            <EmptyState title="No reimbursements yet" description="Reimbursed claims will appear here." />
          ) : (
            <div className="-mx-2 space-y-1">
              {recentReimbursements.map((c) => (
                <Link
                  key={c.id}
                  href={`/expenses/claims/${c.id}`}
                  className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
                      {I.CheckCircle}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {employeeName(c.employee)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.title} · {c.reimbursedAt ? formatDate(c.reimbursedAt) : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-success tabular-nums">
                    {formatCurrency(c.totalAmount)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Recruiter Dashboard ─────────────────────

function RecruiterDashboard() {
  const recruitment = useAsync(safe(() => getDashboardSummary()), []);

  const data = recruitment.data;
  const pipelineRaw: Record<string, number> = data?.pipeline ?? {};
  const pipeline: Array<{ stage: string; count: number }> = Object.entries(pipelineRaw).map(
    ([stage, count]) => ({ stage, count }),
  );
  const recentApplications: any[] = data?.recentApplications ?? [];
  const upcomingInterviews: any[] = data?.upcomingInterviews ?? [];
  const recentOffers: any[] = data?.recentOffers ?? [];

  const pipelineMax = pipeline.reduce((m, p) => Math.max(m, p.count), 1);

  const stageColors = [
    'from-primary to-primary/60',
    'from-violet to-violet/60',
    'from-cyan to-cyan/60',
    'from-pink to-pink/60',
    'from-success to-success/60',
    'from-warning to-warning/60',
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Total Candidates"
          value={data?.totalCandidates ?? 0}
          href="/recruitment/candidates"
          accent="primary"
          icon={I.Users}
          loading={recruitment.loading}
        />
        <KpiCard
          label="Active Applications"
          value={data?.activeApplications ?? 0}
          href="/recruitment/applications"
          accent="cyan"
          icon={I.Briefcase}
          loading={recruitment.loading}
        />
        <KpiCard
          label="Interviews Scheduled"
          value={data?.interviewsScheduled ?? 0}
          href="/recruitment/interviews"
          accent="violet"
          icon={I.Calendar}
          loading={recruitment.loading}
        />
        <KpiCard
          label="Offers Extended"
          value={data?.offersExtended ?? 0}
          href="/recruitment/offers"
          accent="warning"
          icon={I.Receipt}
          loading={recruitment.loading}
        />
        <KpiCard
          label="Hires This Month"
          value={data?.hiresThisMonth ?? 0}
          href="/recruitment/applications"
          accent="success"
          icon={I.CheckCircle}
          loading={recruitment.loading}
        />
      </div>

      {/* Pipeline overview */}
      <SectionCard title="Pipeline overview" subtitle="Active candidates per stage">
        {pipeline.length === 0 ? (
          <EmptyState title="No pipeline data" description="Active applications with stages will appear here." />
        ) : (
          <div className="space-y-3">
            {pipeline.map((stage, idx) => {
              const pct = Math.round((stage.count / pipelineMax) * 100);
              return (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="capitalize">{stage.stage.replace(/_/g, ' ').toLowerCase()}</span>
                    <span className="font-medium tabular-nums text-foreground">{stage.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary/60 ring-1 ring-inset ring-border/40">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${stageColors[idx % stageColors.length]} transition-all duration-700 ease-out`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Recent applications"
          subtitle="Latest candidates in the pipeline"
          viewAllHref="/recruitment/applications"
        >
          {recentApplications.length === 0 ? (
            <EmptyState title="No recent applications" description="New applications will appear here." />
          ) : (
            <div className="-mx-2 space-y-1">
              {recentApplications.slice(0, 5).map((app: any) => (
                <Link
                  key={app.id}
                  href={`/recruitment/applications/${app.id}`}
                  className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="gradient-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white shadow-sm">
                      {initials(app.candidate?.firstName, app.candidate?.lastName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {employeeName(app.candidate)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {app.jobRequisition?.title ?? 'Position'} · {formatDate(app.appliedAt ?? app.createdAt)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Upcoming interviews"
          subtitle="Scheduled soon"
          viewAllHref="/recruitment/interviews"
        >
          {upcomingInterviews.length === 0 ? (
            <EmptyState title="No upcoming interviews" description="Scheduled interviews will appear here." />
          ) : (
            <div className="-mx-2 space-y-1">
              {upcomingInterviews.slice(0, 4).map((iv: any) => (
                <Link
                  key={iv.id}
                  href={`/recruitment/applications/${iv.applicationId}`}
                  className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      {I.Calendar}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {employeeName(iv.application?.candidate)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {iv.type?.replace(/_/g, ' ')} · {formatDateTime(iv.scheduledAt)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={iv.status} />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Recent offers */}
      <SectionCard
        title="Recent offers"
        subtitle="Latest offers extended"
        viewAllHref="/recruitment/offers"
      >
        {recentOffers.length === 0 ? (
          <EmptyState title="No recent offers" description="Offers extended to candidates will appear here." />
        ) : (
          <div className="-mx-2 space-y-1">
            {recentOffers.slice(0, 5).map((offer: any) => (
              <Link
                key={offer.id}
                href={`/recruitment/applications/${offer.applicationId}`}
                className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="gradient-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white shadow-sm">
                    {initials(offer.application?.candidate?.firstName, offer.application?.candidate?.lastName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {employeeName(offer.application?.candidate)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatCurrency(parseFloat(offer.baseSalary ?? '0'))} · {formatDate(offer.createdAt)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={offer.status} />
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Manager Dashboard ───────────────────────

function ManagerDashboard({ userId }: { userId: string }) {
  const todayStr = today();

  const allEmployees = useAsync(safe(() => listEmployees()), []);
  const pendingLeavesQueue = useAsync(safe(() => getPendingApprovals()), []);
  const pendingExpensesQueue = useAsync(safe(() => getPendingClaims()), []);
  const approvedLeaves = useAsync(safe(() => getAllLeaveRequests('APPROVED')), []);
  const onboardings = useAsync(safe(() => listInstances({ status: 'IN_PROGRESS' })), []);

  const me = allEmployees.data?.find((e) => e.userId === userId);
  const directReports = allEmployees.data?.filter((e) => e.reportingManagerId === me?.id) ?? [];
  const directReportIds = new Set(directReports.map((e) => e.id));

  const teamOnLeaveToday =
    approvedLeaves.data?.filter(
      (lr) =>
        lr.startDate <= todayStr &&
        lr.endDate >= todayStr &&
        directReportIds.has(lr.employeeId),
    ) ?? [];

  const teamOnboardings =
    onboardings.data?.filter((inst: any) => directReportIds.has(inst.employeeId)) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Team Size"
          value={directReports.length}
          hint="direct reports"
          href="/employees"
          accent="primary"
          icon={I.Users}
          loading={allEmployees.loading}
        />
        <KpiCard
          label="Pending Leave Approvals"
          value={pendingLeavesQueue.data?.length ?? 0}
          hint="in your queue"
          href="/leave/requests?view=pending"
          accent="violet"
          icon={I.Plane}
          loading={pendingLeavesQueue.loading}
        />
        <KpiCard
          label="Pending Expense Approvals"
          value={pendingExpensesQueue.data?.length ?? 0}
          hint="in your queue"
          href="/expenses/claims?view=pending"
          accent="warning"
          icon={I.Receipt}
          loading={pendingExpensesQueue.loading}
        />
        <KpiCard
          label="Team On Leave Today"
          value={teamOnLeaveToday.length}
          hint="approved leave"
          href="/leave/requests?status=APPROVED"
          accent="pink"
          icon={I.Calendar}
          loading={approvedLeaves.loading}
        />
        <KpiCard
          label="Team Onboarding"
          value={teamOnboardings.length}
          hint="in progress"
          href="/onboarding"
          accent="cyan"
          icon={I.Rocket}
          loading={onboardings.loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Pending team approvals"
          subtitle="Leave and expense requests awaiting you"
          viewAllHref="/leave/requests?view=pending"
        >
          {(pendingLeavesQueue.data?.length ?? 0) + (pendingExpensesQueue.data?.length ?? 0) === 0 ? (
            <EmptyState title="All caught up" description="Pending approvals from your team will appear here." />
          ) : (
            <div className="-mx-2 space-y-1">
              {(pendingLeavesQueue.data ?? []).slice(0, 3).map((lr) => (
                <Link
                  key={lr.id}
                  href={`/leave/requests/${lr.id}`}
                  className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet/15 text-violet">
                      {I.Plane}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {employeeName(lr.employee)} · Leave
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lr.leavePolicy?.name} · {formatDate(lr.startDate)}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
                    {lr.totalDays}d
                  </span>
                </Link>
              ))}
              {(pendingExpensesQueue.data ?? []).slice(0, 3).map((c) => (
                <Link
                  key={c.id}
                  href={`/expenses/claims/${c.id}`}
                  className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pink/15 text-pink">
                      {I.Receipt}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {employeeName(c.employee)} · Expense
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.title} · {c.claimNumber}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatCurrency(c.totalAmount)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="My team today"
          subtitle={
            directReports.length > 0
              ? `${directReports.length - teamOnLeaveToday.length} present · ${teamOnLeaveToday.length} on leave`
              : 'No direct reports found'
          }
          viewAllHref="/employees"
        >
          {directReports.length === 0 ? (
            <EmptyState title="No direct reports" description="Your direct reports will appear here once assigned." />
          ) : (
            <div className="-mx-2 space-y-1">
              {directReports.slice(0, 6).map((emp) => {
                const onLeave = teamOnLeaveToday.some((lr) => lr.employeeId === emp.id);
                return (
                  <Link
                    key={emp.id}
                    href={`/employees/${emp.id}`}
                    className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="gradient-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white shadow-sm">
                        {initials(emp.firstName, emp.lastName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {employeeName(emp)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {emp.designation?.name ?? emp.department?.name ?? '—'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        onLeave
                          ? 'bg-violet/15 text-violet'
                          : 'bg-success/15 text-success'
                      }`}
                    >
                      {onLeave ? 'on leave' : 'in'}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Team onboarding */}
      <SectionCard
        title="Team onboarding in progress"
        subtitle="Direct reports currently in onboarding"
        viewAllHref="/onboarding"
      >
        {teamOnboardings.length === 0 ? (
          <EmptyState title="No onboarding in progress" description="Team members in onboarding will appear here." />
        ) : (
          <div className="-mx-2 space-y-1">
            {teamOnboardings.slice(0, 4).map((inst: any) => {
              const totalTasks = inst._count?.tasks ?? 0;
              return (
                <Link
                  key={inst.id}
                  href={`/onboarding/${inst.id}`}
                  className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan/15 text-cyan">
                      {I.Rocket}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {employeeName(inst.employee)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        Joined {formatDate(inst.joiningDate)} · {totalTasks} tasks
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={inst.status} />
                </Link>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Employee Dashboard ──────────────────────

function EmployeeDashboard() {
  const { success, error: toastError } = useToast();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const year = new Date().getUTCFullYear();

  const myToday = useAsync(safe(() => getMyToday()), []);
  const myLeaveBalances = useAsync(safe(() => getMyBalances(year)), []);
  const myPendingLeaves = useAsync(safe(() => getMyLeaveRequests('PENDING')), []);
  const myRecentLeaves = useAsync(safe(() => getMyLeaveRequests()), []);
  const myPendingExpenses = useAsync(safe(() => getMyClaims('SUBMITTED')), []);
  const myOnboarding = useAsync(safe(() => getMyInstance()), []);

  const summary = myToday.data?.summary;
  const logs = myToday.data?.logs ?? [];
  // A check-in log exists if any log has logType CHECK_IN
  const hasCheckIn = logs.some((l) => l.logType === 'CHECK_IN');
  // A check-out log exists if any log has logType CHECK_OUT
  const lastCheckOut = [...logs].reverse().find((l) => l.logType === 'CHECK_OUT');
  const checkedIn = !!summary || hasCheckIn;
  const checkedOut = !!lastCheckOut;

  let todayStatus = 'Not checked in';
  if (summary?.status === 'PRESENT') todayStatus = 'Checked in';
  else if (summary?.status === 'HALF_DAY') todayStatus = 'Half day';
  else if (checkedIn && checkedOut && lastCheckOut?.timestamp) {
    const t = new Date(lastCheckOut.timestamp);
    todayStatus = `Out at ${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`;
  } else if (checkedIn) {
    todayStatus = 'Checked in';
  }

  const annualBalance = myLeaveBalances.data?.find(
    (b) => b.leavePolicy?.code === 'ANNUAL' || b.leavePolicy?.name?.toLowerCase().includes('annual'),
  );
  const totalBalance = myLeaveBalances.data?.reduce((s, b) => s + parseFloat(b.balance ?? '0'), 0) ?? 0;
  const leaveBalanceValue = annualBalance != null ? parseFloat(annualBalance.balance) : totalBalance;
  const leaveBalanceHint =
    annualBalance != null && myLeaveBalances.data && myLeaveBalances.data.length > 1
      ? `${totalBalance.toFixed(1)} days across all types`
      : undefined;

  const instance = myOnboarding.data;
  const onboardingTasks: any[] = (instance as any)?.tasks ?? [];
  const incompleteTasks = onboardingTasks.filter((t) => t.status !== 'COMPLETED');
  const completedCount = onboardingTasks.length - incompleteTasks.length;
  const onboardingValue =
    instance ? `${completedCount}/${onboardingTasks.length}` : '—';

  async function handleCheckIn() {
    setCheckingIn(true);
    try {
      await checkIn();
      success('Checked in', 'Your attendance has been recorded.');
      myToday.refetch();
    } catch {
      toastError('Check-in failed', 'Please try again.');
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckOut() {
    setCheckingOut(true);
    try {
      await checkOut();
      success('Checked out', 'Have a great rest of your day!');
      myToday.refetch();
    } catch {
      toastError('Check-out failed', 'Please try again.');
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Leave Balance"
          value={`${leaveBalanceValue}d`}
          hint={leaveBalanceHint}
          href="/leave/requests?view=my"
          accent="success"
          icon={I.Plane}
          loading={myLeaveBalances.loading}
        />
        <KpiCard
          label="Pending Leaves"
          value={myPendingLeaves.data?.length ?? 0}
          hint="awaiting approval"
          href="/leave/requests?view=my"
          accent="violet"
          icon={I.Bell}
          loading={myPendingLeaves.loading}
        />
        <KpiCard
          label="Pending Expenses"
          value={myPendingExpenses.data?.length ?? 0}
          hint="submitted claims"
          href="/expenses/claims?view=my"
          accent="warning"
          icon={I.Receipt}
          loading={myPendingExpenses.loading}
        />
        <KpiCard
          label="Today's Status"
          value={myToday.loading ? '…' : todayStatus}
          href="/attendance/daily"
          accent="cyan"
          icon={I.Clock}
          loading={myToday.loading}
        />
        <KpiCard
          label="My Onboarding"
          value={onboardingValue}
          hint={instance ? 'tasks completed' : 'no active onboarding'}
          href="/onboarding/my"
          accent="primary"
          icon={I.Rocket}
          loading={myOnboarding.loading}
        />
      </div>

      {/* Quick actions */}
      <SectionCard title="Quick actions" subtitle="Check in or out for today">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCheckIn}
            disabled={checkedIn || checkingIn}
            className="inline-flex items-center gap-2 rounded-xl bg-success/15 px-4 py-2.5 text-sm font-semibold text-success transition-all hover:bg-success/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {I.CheckCircle}
            {checkingIn ? 'Checking in…' : 'Check In'}
          </button>
          <button
            onClick={handleCheckOut}
            disabled={!checkedIn || checkedOut || checkingOut}
            className="inline-flex items-center gap-2 rounded-xl bg-violet/15 px-4 py-2.5 text-sm font-semibold text-violet transition-all hover:bg-violet/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {I.Clock}
            {checkingOut ? 'Checking out…' : 'Check Out'}
          </button>
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My recent leaves */}
        <SectionCard
          title="My recent leaves"
          subtitle="Latest leave requests"
          viewAllHref="/leave/requests?view=my"
        >
          {(myRecentLeaves.data ?? []).length === 0 ? (
            <EmptyState title="No leave requests" description="Your leave requests will appear here." />
          ) : (
            <div className="-mx-2 space-y-1">
              {(myRecentLeaves.data ?? []).slice(0, 4).map((lr) => (
                <Link
                  key={lr.id}
                  href={`/leave/requests/${lr.id}`}
                  className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet/15 text-violet">
                      {I.Plane}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {lr.leavePolicy?.name ?? 'Leave'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(lr.startDate)}
                        {lr.startDate !== lr.endDate && ` → ${formatDate(lr.endDate)}`}
                        {' · '}{lr.totalDays}d
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={lr.status} />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        {/* My pending expense claims */}
        <SectionCard
          title="My pending expense claims"
          subtitle="Submitted, awaiting review"
          viewAllHref="/expenses/claims?view=my"
        >
          {(myPendingExpenses.data ?? []).length === 0 ? (
            <EmptyState title="No pending claims" description="Submitted expense claims will appear here." />
          ) : (
            <div className="-mx-2 space-y-1">
              {(myPendingExpenses.data ?? []).slice(0, 4).map((c) => (
                <Link
                  key={c.id}
                  href={`/expenses/claims/${c.id}`}
                  className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pink/15 text-pink">
                      {I.Receipt}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {c.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.claimNumber} · {formatDate(c.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatCurrency(c.totalAmount)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* My onboarding tasks */}
      {instance && (
        <SectionCard
          title="My onboarding tasks"
          subtitle={`${completedCount} of ${onboardingTasks.length} tasks completed`}
          viewAllHref="/onboarding/my"
        >
          {onboardingTasks.length === 0 ? (
            <EmptyState title="No tasks" description="Your onboarding tasks will appear here." />
          ) : (
            <div className="-mx-2 space-y-1">
              {[...incompleteTasks, ...onboardingTasks.filter((t) => t.status === 'COMPLETED')]
                .slice(0, 4)
                .map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-xl px-2 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          task.status === 'COMPLETED'
                            ? 'bg-success/15 text-success'
                            : 'bg-cyan/15 text-cyan'
                        }`}
                      >
                        {task.status === 'COMPLETED' ? I.CheckCircle : I.Rocket}
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-medium ${task.status === 'COMPLETED' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                          {task.title}
                        </p>
                        {task.dueDate && (
                          <p className="truncate text-xs text-muted-foreground">
                            Due {formatDate(task.dueDate)}
                          </p>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();

  const roles: string[] = user?.user?.roles ?? [];
  const variant = pickVariant(roles);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const subtitleByVariant: Record<DashVariant, string> = {
    company: "Here's a snapshot of what's happening across the company today.",
    finance: "Here's an overview of payroll and expense reimbursements.",
    recruiter: "Here's where your pipeline, interviews and offers stand today.",
    manager: "Here's what's happening with your team today.",
    employee: "Here's your personal summary for today.",
  };

  return (
    <div className="motion-fade-in space-y-6">
      {/* Hero */}
      <header className="aurora-tight relative overflow-hidden rounded-2xl border border-hairline bg-card/40 p-6 backdrop-blur">
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {dateLabel}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            Welcome back,{' '}
            <span className="text-gradient-brand">{user?.account?.firstName ?? 'there'}</span>
            <span className="text-foreground">.</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            {subtitleByVariant[variant]}
          </p>
        </div>
      </header>

      {/* Variant body */}
      {variant === 'company' && <CompanyDashboard />}
      {variant === 'finance' && <FinanceDashboard />}
      {variant === 'recruiter' && <RecruiterDashboard />}
      {variant === 'manager' && <ManagerDashboard userId={user?.user?.id ?? ''} />}
      {variant === 'employee' && <EmployeeDashboard />}
    </div>
  );
}
