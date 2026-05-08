'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { usePermission } from '@/lib/hooks';
import { getPendingApprovals, reviewLeaveRequest } from '@/lib/leave-api';
import { getPendingClaims, reviewExpenseClaim } from '@/lib/expense-api';
import { getMyTasks, updateTaskStatus } from '@/lib/onboarding-api';
import { getAllCorrections, reviewCorrection } from '@/lib/attendance-api';
import { formatDate, formatCurrency, employeeName } from '@/lib/format';
import type { LeaveRequest } from '@/types/leave';
import type { ExpenseClaim } from '@/types/expense';
import type { OnboardingTask } from '@/types/onboarding';
import type { AttendanceCorrectionRequest } from '@/types/attendance';

// ─── Types ──────────────────────────────────

type SectionKey = 'leave' | 'expense' | 'onboarding' | 'attendance';

interface SectionMeta {
  key: SectionKey;
  label: string;
  variant: 'leave' | 'expense' | 'onboarding' | 'attendance';
}

const SECTIONS: SectionMeta[] = [
  { key: 'leave', label: 'Leave Requests', variant: 'leave' },
  { key: 'expense', label: 'Expense Claims', variant: 'expense' },
  { key: 'onboarding', label: 'Onboarding Tasks', variant: 'onboarding' },
  { key: 'attendance', label: 'Attendance Corrections', variant: 'attendance' },
];

// ─── Page ───────────────────────────────────

export default function InboxPage() {
  const { can, hasAny } = usePermission();
  const { success, error: toastError } = useToast();
  const confirm = useConfirm();

  const canApproveLeave = can('leave.approve');
  const canApproveExpense = can('expense.approve');
  const canUpdateOnboarding = can('onboarding.task.update');
  const canManageAttendance = can('attendance.manage');
  const hasAnyApproval = hasAny(
    'leave.approve',
    'expense.approve',
    'onboarding.task.update',
    'attendance.manage',
  );

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [expenses, setExpenses] = useState<ExpenseClaim[]>([]);
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [corrections, setCorrections] = useState<AttendanceCorrectionRequest[]>([]);

  const [loadingLeave, setLoadingLeave] = useState(canApproveLeave);
  const [loadingExpense, setLoadingExpense] = useState(canApproveExpense);
  const [loadingOnboarding, setLoadingOnboarding] = useState(canUpdateOnboarding);
  const [loadingAttendance, setLoadingAttendance] = useState(canManageAttendance);

  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({
    leave: false,
    expense: false,
    onboarding: false,
    attendance: false,
  });

  const [busyId, setBusyId] = useState<string | null>(null);

  // Set document title
  useDocumentTitle('Inbox');

  // ─── Loaders ─────────────────────────────

  async function loadLeave() {
    if (!canApproveLeave) return;
    setLoadingLeave(true);
    try {
      const data = await getPendingApprovals();
      setLeaves(data);
    } catch {
      // silently ignore — section just stays empty with toast on action
    } finally {
      setLoadingLeave(false);
    }
  }

  async function loadExpense() {
    if (!canApproveExpense) return;
    setLoadingExpense(true);
    try {
      const data = await getPendingClaims();
      setExpenses(data);
    } catch {
      // ignore
    } finally {
      setLoadingExpense(false);
    }
  }

  async function loadOnboarding() {
    if (!canUpdateOnboarding) return;
    setLoadingOnboarding(true);
    try {
      const data = await getMyTasks();
      // Only show non-completed tasks
      setTasks(data.filter((t) => t.status !== 'COMPLETED'));
    } catch {
      // ignore
    } finally {
      setLoadingOnboarding(false);
    }
  }

  async function loadAttendance() {
    if (!canManageAttendance) return;
    setLoadingAttendance(true);
    try {
      const data = await getAllCorrections('PENDING');
      setCorrections(data);
    } catch {
      // ignore
    } finally {
      setLoadingAttendance(false);
    }
  }

  useEffect(() => {
    loadLeave();
    loadExpense();
    loadOnboarding();
    loadAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Counts ──────────────────────────────

  const counts = {
    leave: leaves.length,
    expense: expenses.length,
    onboarding: tasks.length,
    attendance: corrections.length,
  };
  const totalPending =
    counts.leave + counts.expense + counts.onboarding + counts.attendance;
  const anyLoading =
    loadingLeave || loadingExpense || loadingOnboarding || loadingAttendance;

  // ─── Actions ─────────────────────────────

  async function handleLeaveApprove(req: LeaveRequest) {
    setBusyId(req.id);
    try {
      await reviewLeaveRequest(req.id, { action: 'APPROVED' });
      success('Leave approved', `${employeeName(req.employee)}'s request has been approved.`);
      setLeaves((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err) {
      toastError('Approval failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleLeaveReject(req: LeaveRequest) {
    const ok = await confirm({
      title: 'Reject leave request?',
      description: `This will reject ${employeeName(req.employee)}'s ${req.leavePolicy?.name ?? 'leave'} request.`,
      tone: 'danger',
      confirmLabel: 'Reject',
    });
    if (!ok) return;
    setBusyId(req.id);
    try {
      await reviewLeaveRequest(req.id, { action: 'REJECTED' });
      success('Leave rejected', 'The request has been rejected.');
      setLeaves((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err) {
      toastError('Rejection failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleExpenseApprove(claim: ExpenseClaim) {
    setBusyId(claim.id);
    try {
      await reviewExpenseClaim(claim.id, { action: 'APPROVED' });
      success('Expense approved', `${claim.claimNumber} approved.`);
      setExpenses((prev) => prev.filter((c) => c.id !== claim.id));
    } catch (err) {
      toastError('Approval failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleExpenseReject(claim: ExpenseClaim) {
    const ok = await confirm({
      title: 'Reject expense claim?',
      description: `This will reject ${claim.claimNumber} (${formatCurrency(claim.totalAmount)}).`,
      tone: 'danger',
      confirmLabel: 'Reject',
    });
    if (!ok) return;
    setBusyId(claim.id);
    try {
      await reviewExpenseClaim(claim.id, { action: 'REJECTED' });
      success('Expense rejected', 'The claim has been rejected.');
      setExpenses((prev) => prev.filter((c) => c.id !== claim.id));
    } catch (err) {
      toastError('Rejection failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleTaskComplete(task: OnboardingTask) {
    setBusyId(task.id);
    try {
      await updateTaskStatus(task.id, { status: 'COMPLETED' });
      success('Task completed', task.title);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      toastError('Could not complete task', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCorrectionApprove(corr: AttendanceCorrectionRequest) {
    setBusyId(corr.id);
    try {
      await reviewCorrection(corr.id, { status: 'APPROVED' });
      success('Correction approved', `${employeeName(corr.employee)}'s correction approved.`);
      setCorrections((prev) => prev.filter((c) => c.id !== corr.id));
    } catch (err) {
      toastError('Approval failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCorrectionReject(corr: AttendanceCorrectionRequest) {
    const ok = await confirm({
      title: 'Reject correction request?',
      description: `Reject ${employeeName(corr.employee)}'s correction for ${formatDate(corr.date)}?`,
      tone: 'danger',
      confirmLabel: 'Reject',
    });
    if (!ok) return;
    setBusyId(corr.id);
    try {
      await reviewCorrection(corr.id, { status: 'REJECTED' });
      success('Correction rejected', 'The correction has been rejected.');
      setCorrections((prev) => prev.filter((c) => c.id !== corr.id));
    } catch (err) {
      toastError('Rejection failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  // ─── Render ──────────────────────────────

  if (!hasAnyApproval) {
    return (
      <div>
        <PageHeader title="Inbox" />
        <div className="rounded-2xl border border-hairline bg-card shadow-soft">
          <EmptyState
            variant="inbox"
            title="No approval responsibilities yet"
            description="The inbox shows items waiting on you. You don't currently have approval responsibilities."
          />
        </div>
      </div>
    );
  }

  const headerSubtitle = anyLoading
    ? 'Loading…'
    : `${totalPending} ${totalPending === 1 ? 'item' : 'items'} pending`;

  return (
    <div>
      <PageHeader title="Inbox" description={headerSubtitle} />

      {!anyLoading && totalPending === 0 && (
        <div className="rounded-2xl border border-hairline bg-card shadow-soft">
          <EmptyState
            variant="inbox"
            title="You're all caught up"
            description="Nothing requires your attention right now."
          />
        </div>
      )}

      <div className="space-y-4">
        {SECTIONS.map((section) => {
          const visible = isSectionVisible(section.key, {
            canApproveLeave,
            canApproveExpense,
            canUpdateOnboarding,
            canManageAttendance,
          });
          if (!visible) return null;

          const loading = sectionLoading(section.key, {
            loadingLeave,
            loadingExpense,
            loadingOnboarding,
            loadingAttendance,
          });
          const count = counts[section.key];
          const isCollapsed = collapsed[section.key];

          return (
            <SectionShell
              key={section.key}
              label={section.label}
              count={count}
              loading={loading}
              collapsed={isCollapsed}
              onToggle={() =>
                setCollapsed((prev) => ({ ...prev, [section.key]: !prev[section.key] }))
              }
            >
              {loading ? (
                <SectionSkeleton />
              ) : count === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Nothing pending here.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {section.key === 'leave' &&
                    leaves.map((req) => (
                      <LeaveCard
                        key={req.id}
                        req={req}
                        busy={busyId === req.id}
                        onApprove={() => handleLeaveApprove(req)}
                        onReject={() => handleLeaveReject(req)}
                      />
                    ))}
                  {section.key === 'expense' &&
                    expenses.map((claim) => (
                      <ExpenseCard
                        key={claim.id}
                        claim={claim}
                        busy={busyId === claim.id}
                        onApprove={() => handleExpenseApprove(claim)}
                        onReject={() => handleExpenseReject(claim)}
                      />
                    ))}
                  {section.key === 'onboarding' &&
                    tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        busy={busyId === task.id}
                        onComplete={() => handleTaskComplete(task)}
                      />
                    ))}
                  {section.key === 'attendance' &&
                    corrections.map((corr) => (
                      <CorrectionCard
                        key={corr.id}
                        corr={corr}
                        busy={busyId === corr.id}
                        onApprove={() => handleCorrectionApprove(corr)}
                        onReject={() => handleCorrectionReject(corr)}
                      />
                    ))}
                </div>
              )}
            </SectionShell>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────

function isSectionVisible(
  key: SectionKey,
  perms: {
    canApproveLeave: boolean;
    canApproveExpense: boolean;
    canUpdateOnboarding: boolean;
    canManageAttendance: boolean;
  },
): boolean {
  switch (key) {
    case 'leave':
      return perms.canApproveLeave;
    case 'expense':
      return perms.canApproveExpense;
    case 'onboarding':
      return perms.canUpdateOnboarding;
    case 'attendance':
      return perms.canManageAttendance;
  }
}

function sectionLoading(
  key: SectionKey,
  state: {
    loadingLeave: boolean;
    loadingExpense: boolean;
    loadingOnboarding: boolean;
    loadingAttendance: boolean;
  },
): boolean {
  switch (key) {
    case 'leave':
      return state.loadingLeave;
    case 'expense':
      return state.loadingExpense;
    case 'onboarding':
      return state.loadingOnboarding;
    case 'attendance':
      return state.loadingAttendance;
  }
}

// ─── Section shell ─────────────────────────

interface SectionShellProps {
  label: string;
  count: number;
  loading: boolean;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function SectionShell({ label, count, loading, collapsed, onToggle, children }: SectionShellProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-soft">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 border-b border-border/40 bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted/60"
      >
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth={2}
            stroke="currentColor"
            className={`h-4 w-4 text-muted-foreground transition-transform duration-150 ${
              collapsed ? '-rotate-90' : ''
            }`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
          <span
            className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
              count > 0 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {loading ? '…' : count}
          </span>
        </div>
      </button>
      {!collapsed && children}
    </section>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}

// ─── Cards ─────────────────────────────────

interface ApproveRejectButtonsProps {
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}

function ApproveRejectButtons({ onApprove, onReject, busy }: ApproveRejectButtonsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        disabled={busy}
        onClick={onApprove}
        className="inline-flex h-8 items-center gap-1 rounded-lg bg-success/15 px-2.5 text-xs font-medium text-success transition-colors hover:bg-success/25 disabled:opacity-50 motion-press"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
        </svg>
        Approve
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onReject}
        className="inline-flex h-8 items-center gap-1 rounded-lg bg-destructive/15 px-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/25 disabled:opacity-50 motion-press"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
        Reject
      </button>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const init =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  return (
    <div className="gradient-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm">
      {init}
    </div>
  );
}

function LeaveCard({
  req,
  busy,
  onApprove,
  onReject,
}: {
  req: LeaveRequest;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const name = employeeName(req.employee);
  const policy = req.leavePolicy?.name ?? 'Leave';
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <Link
            href={`/leave/requests/${req.id}`}
            className="truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
          >
            {name}
          </Link>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="truncate text-xs text-muted-foreground">{policy}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatDate(req.startDate)} → {formatDate(req.endDate)} · {req.totalDays} day
          {parseFloat(req.totalDays) === 1 ? '' : 's'}
        </p>
        {req.reason && (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground/80">{req.reason}</p>
        )}
      </div>
      <ApproveRejectButtons busy={busy} onApprove={onApprove} onReject={onReject} />
    </div>
  );
}

function ExpenseCard({
  claim,
  busy,
  onApprove,
  onReject,
}: {
  claim: ExpenseClaim;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const name = employeeName(claim.employee);
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <Link
            href={`/expenses/claims/${claim.id}`}
            className="truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
          >
            {claim.claimNumber}
          </Link>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="truncate text-xs text-muted-foreground">{claim.title}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {name} · {formatCurrency(claim.totalAmount)}
          {claim.submittedAt && ` · submitted ${formatDate(claim.submittedAt)}`}
        </p>
      </div>
      <ApproveRejectButtons busy={busy} onApprove={onApprove} onReject={onReject} />
    </div>
  );
}

function TaskCard({
  task,
  busy,
  onComplete,
}: {
  task: OnboardingTask;
  busy: boolean;
  onComplete: () => void;
}) {
  const newHire = task.onboardingInstance?.employee
    ? employeeName(task.onboardingInstance.employee)
    : null;
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <Link
            href={`/onboarding/${task.onboardingInstanceId}`}
            className="truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
          >
            {task.title}
          </Link>
          {task.isOverdue && task.status !== 'COMPLETED' && (
            <span className="rounded bg-destructive-soft px-1.5 py-0.5 text-[10px] font-medium text-destructive">
              Overdue
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          Due {formatDate(task.dueDate)}
          {newHire && ` · for ${newHire}`}
          {task.status !== 'NOT_STARTED' && ` · ${task.status.replace(/_/g, ' ').toLowerCase()}`}
        </p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={onComplete}
        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-success/15 px-2.5 text-xs font-medium text-success transition-colors hover:bg-success/25 disabled:opacity-50 motion-press"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
        </svg>
        Mark complete
      </button>
    </div>
  );
}

function CorrectionCard({
  corr,
  busy,
  onApprove,
  onReject,
}: {
  corr: AttendanceCorrectionRequest;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const name = employeeName(corr.employee);
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="truncate text-xs text-muted-foreground">
            Correction for {formatDate(corr.date)}
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground/80">{corr.reason}</p>
      </div>
      <ApproveRejectButtons busy={busy} onApprove={onApprove} onReject={onReject} />
    </div>
  );
}
