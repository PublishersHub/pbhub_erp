'use client';

import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/lib/hooks';
import { listEmployees } from '@/lib/employee-api';
import { getTodayReport } from '@/lib/attendance-api';
import { getAllLeaveRequests, listHolidays } from '@/lib/leave-api';
import { getAllClaims } from '@/lib/expense-api';
import { listInstances } from '@/lib/onboarding-api';
import { getDashboardSummary } from '@/lib/recruitment-api';
import { formatDate, formatDateTime, formatCurrency, employeeName } from '@/lib/format';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

// ─── Helpers ────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

function safe<T>(fn: () => Promise<T>): () => Promise<T | null> {
  return () => fn().catch(() => null);
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
}: {
  label: string;
  value: number | string;
  hint?: string;
  href: string;
  accent?: 'primary' | 'violet' | 'pink' | 'cyan' | 'success' | 'warning';
  icon: JSX.Element;
  loading?: boolean;
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
};

// Initials helper
function initials(first?: string, last?: string) {
  return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || '?';
}

// ─── Main component ──────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const year = new Date().getUTCFullYear();
  const todayStr = today();

  // Fan out — each section loads independently; one failure doesn't sink the page.
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

  // Who's on leave today
  const todaysApprovedLeaves =
    approvedLeaves.data?.filter(
      (lr) => lr.startDate <= todayStr && lr.endDate >= todayStr,
    ) ?? [];

  // Upcoming holidays in the next 30 days
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

  const openPositions = recruitment.data?.openRequisitions ?? 0;
  const upcomingInterviews = recruitment.data?.upcomingInterviews ?? [];

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

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
            Here's a snapshot of what's happening across the company today.
          </p>
        </div>
      </header>

      {/* Top KPI row — company-wide */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Active Employees"
          value={activeEmployees}
          hint={employees.data ? `${employees.data.length} total` : undefined}
          href="/employees"
          accent="primary"
          icon={I.Users}
          loading={employees.loading}
        />
        <KpiCard
          label="Present Today"
          value={present}
          hint={
            activeEmployees > 0
              ? `${attendancePct}% of active`
              : undefined
          }
          href="/attendance/daily"
          accent="success"
          icon={I.CheckCircle}
          loading={todayAttendance.loading}
        />
        <KpiCard
          label="On Leave Today"
          value={onLeaveToday}
          hint={lateToday > 0 ? `${lateToday} late` : undefined}
          href="/leave/requests?status=APPROVED"
          accent="violet"
          icon={I.Plane}
          loading={todayAttendance.loading}
        />
        <KpiCard
          label="Pending Approvals"
          value={totalPendingApprovals}
          hint={`${pendingLeavesCount} leave · ${pendingClaimsCount} expense`}
          href="/leave/requests?view=pending"
          accent="warning"
          icon={I.Bell}
          loading={pendingLeaves.loading || pendingClaims.loading}
        />
        <KpiCard
          label="Open Positions"
          value={openPositions}
          hint={recruitment.data ? `${recruitment.data.activeApplications} applications` : undefined}
          href="/recruitment/requisitions"
          accent="cyan"
          icon={I.Briefcase}
          loading={recruitment.loading}
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
            {/* Attendance bar */}
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

      {/* Upcoming holidays — slim strip */}
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
    </div>
  );
}

// ─── PulsePill — small inline KPI used inside "Today at a glance" ────

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
    <div className={`flex items-center gap-3 rounded-xl border border-hairline bg-card/40 p-3 backdrop-blur`}>
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
