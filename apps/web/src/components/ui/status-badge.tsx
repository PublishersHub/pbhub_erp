'use client';

const COLOR_MAP: Record<string, string> = {
  // Requisition
  DRAFT: 'bg-warning-soft text-warning border border-warning/20',
  PENDING_APPROVAL: 'bg-warning-soft text-warning border border-warning/20',
  APPROVED: 'bg-success-soft text-success border border-success/20',
  REJECTED: 'bg-destructive-soft text-destructive border border-destructive/20',
  OPEN: 'bg-info-soft text-info border border-info/20',
  ON_HOLD: 'bg-warning-soft text-warning border border-warning/20',
  FILLED: 'bg-success-soft text-success border border-success/20',
  CANCELLED: 'bg-destructive-soft text-destructive border border-destructive/20',
  CLOSED: 'bg-secondary text-secondary-foreground border border-border',
  // Application
  APPLIED: 'bg-info-soft text-info border border-info/20',
  IN_PROGRESS: 'bg-info-soft text-info border border-info/20',
  OFFER_EXTENDED: 'bg-info-soft text-info border border-info/20',
  HIRED: 'bg-success-soft text-success border border-success/20',
  WITHDRAWN: 'bg-secondary text-secondary-foreground border border-border',
  // Posting
  PUBLISHED: 'bg-success-soft text-success border border-success/20',
  // Interview
  SCHEDULED: 'bg-info-soft text-info border border-info/20',
  COMPLETED: 'bg-success-soft text-success border border-success/20',
  NO_SHOW: 'bg-destructive-soft text-destructive border border-destructive/20',
  RESCHEDULED: 'bg-warning-soft text-warning border border-warning/20',
  // Offer
  EXTENDED: 'bg-info-soft text-info border border-info/20',
  ACCEPTED: 'bg-success-soft text-success border border-success/20',
  DECLINED: 'bg-destructive-soft text-destructive border border-destructive/20',
  RESCINDED: 'bg-destructive-soft text-destructive border border-destructive/20',
  EXPIRED: 'bg-destructive-soft text-destructive border border-destructive/20',
  // Recommendation
  STRONG_HIRE: 'bg-success-soft text-success border border-success/20',
  HIRE: 'bg-success-soft text-success border border-success/20',
  NO_HIRE: 'bg-destructive-soft text-destructive border border-destructive/20',
  STRONG_NO_HIRE: 'bg-destructive-soft text-destructive border border-destructive/20',
  NEEDS_ANOTHER_ROUND: 'bg-warning-soft text-warning border border-warning/20',
  // Onboarding
  NOT_STARTED: 'bg-secondary text-secondary-foreground border border-border',
  BLOCKED: 'bg-warning-soft text-warning border border-warning/20',
  // Employment status
  ACTIVE: 'bg-success-soft text-success border border-success/20',
  PROBATION: 'bg-warning-soft text-warning border border-warning/20',
  NOTICE_PERIOD: 'bg-warning-soft text-warning border border-warning/20',
  RESIGNED: 'bg-secondary text-secondary-foreground border border-border',
  TERMINATED: 'bg-destructive-soft text-destructive border border-destructive/20',
  // Employment type
  FULL_TIME: 'bg-primary-soft text-primary border border-primary/20',
  PART_TIME: 'bg-info-soft text-info border border-info/20',
  CONTRACT: 'bg-info-soft text-info border border-info/20',
  INTERN: 'bg-warning-soft text-warning border border-warning/20',
  // Performance
  GOAL_SETTING: 'bg-warning-soft text-warning border border-warning/20',
  SELF_REVIEW: 'bg-info-soft text-info border border-info/20',
  MANAGER_REVIEW: 'bg-info-soft text-info border border-info/20',
  CALIBRATION: 'bg-info-soft text-info border border-info/20',
  PERCENTAGE: 'bg-primary-soft text-primary border border-primary/20',
  NUMERIC: 'bg-info-soft text-info border border-info/20',
  QUALITATIVE: 'bg-secondary text-secondary-foreground border border-border',
  SELF_REVIEW_IN_PROGRESS: 'bg-warning-soft text-warning border border-warning/20',
  SELF_REVIEW_SUBMITTED: 'bg-info-soft text-info border border-info/20',
  MANAGER_REVIEW_IN_PROGRESS: 'bg-info-soft text-info border border-info/20',
  MANAGER_REVIEW_SUBMITTED: 'bg-primary-soft text-primary border border-primary/20',
  // Expense
  SUBMITTED: 'bg-warning-soft text-warning border border-warning/20',
  MANAGER_APPROVED: 'bg-info-soft text-info border border-info/20',
  FINANCE_APPROVED: 'bg-success-soft text-success border border-success/20',
  REIMBURSED: 'bg-success-soft text-success border border-success/20',
  // Payroll (DRAFT already above)
  PROCESSING: 'bg-info-soft text-info border border-info/20',
  PROCESSED: 'bg-primary-soft text-primary border border-primary/20',
  FINALIZED: 'bg-primary-soft text-primary border border-primary/20',
  EARNING: 'bg-success-soft text-success border border-success/20',
  DEDUCTION: 'bg-destructive-soft text-destructive border border-destructive/20',
  // Attendance
  PRESENT: 'bg-success-soft text-success border border-success/20',
  ABSENT: 'bg-destructive-soft text-destructive border border-destructive/20',
  HALF_DAY: 'bg-warning-soft text-warning border border-warning/20',
  LATE: 'bg-warning-soft text-warning border border-warning/20',
  ON_LEAVE: 'bg-info-soft text-info border border-info/20',
  HOLIDAY: 'bg-primary-soft text-primary border border-primary/20',
  WEEKEND: 'bg-secondary text-secondary-foreground border border-border',
  FIXED: 'bg-primary-soft text-primary border border-primary/20',
  FLEXIBLE: 'bg-info-soft text-info border border-info/20',
  // Leave
  PENDING: 'bg-warning-soft text-warning border border-warning/20',
  FULL_DAY: 'bg-primary-soft text-primary border border-primary/20',
  FIRST_HALF: 'bg-info-soft text-info border border-info/20',
  SECOND_HALF: 'bg-info-soft text-info border border-info/20',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const color = COLOR_MAP[status] || 'bg-secondary text-secondary-foreground border border-border';
  const label = status.replace(/_/g, ' ');
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${color} ${className}`}
    >
      {label}
    </span>
  );
}
