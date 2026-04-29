'use client';

const COLOR_MAP: Record<string, string> = {
  // Requisition
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-700',
  OPEN: 'bg-blue-100 text-blue-700',
  ON_HOLD: 'bg-orange-100 text-orange-700',
  FILLED: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-gray-200 text-gray-500',
  CLOSED: 'bg-gray-200 text-gray-600',
  // Application
  APPLIED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-cyan-100 text-cyan-700',
  OFFER_EXTENDED: 'bg-indigo-100 text-indigo-700',
  HIRED: 'bg-green-100 text-green-800',
  WITHDRAWN: 'bg-gray-200 text-gray-600',
  // Posting
  PUBLISHED: 'bg-green-100 text-green-700',
  // Interview
  SCHEDULED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  NO_SHOW: 'bg-red-100 text-red-700',
  RESCHEDULED: 'bg-yellow-100 text-yellow-800',
  // Offer
  EXTENDED: 'bg-indigo-100 text-indigo-700',
  ACCEPTED: 'bg-green-100 text-green-800',
  DECLINED: 'bg-red-100 text-red-700',
  RESCINDED: 'bg-orange-100 text-orange-700',
  EXPIRED: 'bg-gray-200 text-gray-500',
  // Recommendation
  STRONG_HIRE: 'bg-green-100 text-green-800',
  HIRE: 'bg-green-50 text-green-700',
  NO_HIRE: 'bg-red-50 text-red-600',
  STRONG_NO_HIRE: 'bg-red-100 text-red-700',
  NEEDS_ANOTHER_ROUND: 'bg-yellow-100 text-yellow-800',
  // Onboarding
  NOT_STARTED: 'bg-gray-100 text-gray-600',
  BLOCKED: 'bg-orange-100 text-orange-700',
  // Employment status
  ACTIVE: 'bg-green-100 text-green-800',
  PROBATION: 'bg-yellow-100 text-yellow-800',
  NOTICE_PERIOD: 'bg-orange-100 text-orange-700',
  RESIGNED: 'bg-gray-200 text-gray-600',
  TERMINATED: 'bg-red-100 text-red-700',
  // Employment type
  FULL_TIME: 'bg-blue-100 text-blue-700',
  PART_TIME: 'bg-purple-100 text-purple-700',
  CONTRACT: 'bg-cyan-100 text-cyan-700',
  INTERN: 'bg-yellow-100 text-yellow-800',
  // Performance
  GOAL_SETTING: 'bg-yellow-100 text-yellow-800',
  SELF_REVIEW: 'bg-blue-100 text-blue-700',
  MANAGER_REVIEW: 'bg-indigo-100 text-indigo-700',
  CALIBRATION: 'bg-purple-100 text-purple-700',
  PERCENTAGE: 'bg-blue-100 text-blue-700',
  NUMERIC: 'bg-cyan-100 text-cyan-700',
  QUALITATIVE: 'bg-gray-100 text-gray-600',
  SELF_REVIEW_IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  SELF_REVIEW_SUBMITTED: 'bg-blue-100 text-blue-700',
  MANAGER_REVIEW_IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  MANAGER_REVIEW_SUBMITTED: 'bg-purple-100 text-purple-700',
  // Expense
  SUBMITTED: 'bg-blue-100 text-blue-700',
  MANAGER_APPROVED: 'bg-indigo-100 text-indigo-700',
  FINANCE_APPROVED: 'bg-green-100 text-green-700',
  REIMBURSED: 'bg-green-100 text-green-800',
  // Payroll (DRAFT already above)
  PROCESSING: 'bg-yellow-100 text-yellow-800',
  PROCESSED: 'bg-blue-100 text-blue-700',
  FINALIZED: 'bg-green-100 text-green-800',
  EARNING: 'bg-green-100 text-green-700',
  DEDUCTION: 'bg-red-100 text-red-700',
  // Attendance
  PRESENT: 'bg-green-100 text-green-800',
  ABSENT: 'bg-red-100 text-red-700',
  HALF_DAY: 'bg-orange-100 text-orange-700',
  LATE: 'bg-yellow-100 text-yellow-800',
  ON_LEAVE: 'bg-purple-100 text-purple-700',
  HOLIDAY: 'bg-blue-100 text-blue-700',
  WEEKEND: 'bg-gray-100 text-gray-600',
  FIXED: 'bg-blue-100 text-blue-700',
  FLEXIBLE: 'bg-cyan-100 text-cyan-700',
  // Leave
  PENDING: 'bg-yellow-100 text-yellow-800',
  FULL_DAY: 'bg-blue-100 text-blue-700',
  FIRST_HALF: 'bg-indigo-100 text-indigo-700',
  SECOND_HALF: 'bg-purple-100 text-purple-700',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const color = COLOR_MAP[status] || 'bg-gray-100 text-gray-700';
  const label = status.replace(/_/g, ' ');
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color} ${className}`}
    >
      {label}
    </span>
  );
}
