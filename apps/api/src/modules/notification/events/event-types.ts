/**
 * Event type constants emitted across modules and consumed by the
 * NotificationEventListenerService. Keep in sync with seed.ts template list.
 */
export const NotificationEvents = {
  // Leave
  LEAVE_SUBMITTED: 'leave.submitted',
  LEAVE_APPROVED: 'leave.approved',
  LEAVE_REJECTED: 'leave.rejected',
  LEAVE_CANCELLED: 'leave.cancelled',

  // Expense
  EXPENSE_SUBMITTED: 'expense.submitted',
  EXPENSE_MANAGER_APPROVED: 'expense.manager_approved',
  EXPENSE_FINANCE_APPROVED: 'expense.finance_approved',
  EXPENSE_REJECTED: 'expense.rejected',
  EXPENSE_REIMBURSED: 'expense.reimbursed',
  EXPENSE_CANCELLED: 'expense.cancelled',

  // Payroll
  PAYROLL_CYCLE_FINALIZED: 'payroll.cycle_finalized',

  // Performance
  PERFORMANCE_CYCLE_STATUS_CHANGED: 'performance.cycle_status_changed',
  PERFORMANCE_GOAL_APPROVED: 'performance.goal_approved',
  PERFORMANCE_GOAL_REJECTED: 'performance.goal_rejected',
  PERFORMANCE_REVIEW_COMPLETED: 'performance.review_completed',

  // Attendance
  ATTENDANCE_CORRECTION_SUBMITTED: 'attendance.correction_submitted',
  ATTENDANCE_CORRECTION_DECIDED: 'attendance.correction_decided',

  // Recruitment
  REQUISITION_SUBMITTED: 'recruitment.requisition_submitted',
  REQUISITION_APPROVED: 'recruitment.requisition_approved',
  REQUISITION_REJECTED: 'recruitment.requisition_rejected',
  POSTING_PUBLISHED: 'recruitment.posting_published',
  APPLICATION_RECEIVED: 'recruitment.application_received',
  APPLICATION_STAGE_CHANGED: 'recruitment.application_stage_changed',
  APPLICATION_REJECTED: 'recruitment.application_rejected',
  APPLICATION_WITHDRAWN: 'recruitment.application_withdrawn',
  INTERVIEW_SCHEDULED: 'recruitment.interview_scheduled',
  INTERVIEW_CANCELLED: 'recruitment.interview_cancelled',
  INTERVIEW_FEEDBACK_SUBMITTED: 'recruitment.interview_feedback_submitted',
  OFFER_EXTENDED: 'recruitment.offer_extended',
  OFFER_RESPONDED: 'recruitment.offer_responded',
  CANDIDATE_HIRED: 'recruitment.candidate_hired',

  // Onboarding
  ONBOARDING_STARTED: 'onboarding.started',
  ONBOARDING_TASK_ASSIGNED: 'onboarding.task_assigned',
  ONBOARDING_TASK_COMPLETED: 'onboarding.task_completed',
  ONBOARDING_COMPLETED: 'onboarding.completed',
} as const;

export type NotificationEventType =
  (typeof NotificationEvents)[keyof typeof NotificationEvents];

/**
 * Common shape emitted by all notification-producing services.
 * Recipients are resolved inside the listener based on eventType.
 */
export interface NotificationEventPayload {
  organizationId: string;
  actorUserId?: string | null; // user who triggered the event (for self-notification filtering)
  referenceId?: string | null;
  referenceType?: string | null;
  // explicit recipients override default resolution
  recipientUserIds?: string[];
  recipientEmployeeIds?: string[];
  // template variables
  variables?: Record<string, string | number | null | undefined>;
}

/**
 * Fallback defaults used if no template is found in the database.
 */
export const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  [NotificationEvents.LEAVE_SUBMITTED]: {
    subject: 'New leave request',
    body: 'A new leave request was submitted.',
  },
  [NotificationEvents.LEAVE_APPROVED]: {
    subject: 'Leave request approved',
    body: 'Your leave request was approved.',
  },
  [NotificationEvents.LEAVE_REJECTED]: {
    subject: 'Leave request rejected',
    body: 'Your leave request was rejected.',
  },
  [NotificationEvents.LEAVE_CANCELLED]: {
    subject: 'Leave request cancelled',
    body: 'A leave request was cancelled.',
  },
  [NotificationEvents.EXPENSE_SUBMITTED]: {
    subject: 'New expense claim',
    body: 'A new expense claim was submitted.',
  },
  [NotificationEvents.EXPENSE_MANAGER_APPROVED]: {
    subject: 'Expense claim awaits finance review',
    body: 'An expense claim was approved by the manager and awaits finance review.',
  },
  [NotificationEvents.EXPENSE_FINANCE_APPROVED]: {
    subject: 'Expense claim approved',
    body: 'Your expense claim was fully approved.',
  },
  [NotificationEvents.EXPENSE_REJECTED]: {
    subject: 'Expense claim rejected',
    body: 'Your expense claim was rejected.',
  },
  [NotificationEvents.EXPENSE_REIMBURSED]: {
    subject: 'Expense claim reimbursed',
    body: 'Your expense claim was reimbursed via payroll.',
  },
  [NotificationEvents.EXPENSE_CANCELLED]: {
    subject: 'Expense claim cancelled',
    body: 'An expense claim was cancelled.',
  },
  [NotificationEvents.PAYROLL_CYCLE_FINALIZED]: {
    subject: 'Payroll finalized',
    body: 'Your payslip is now available.',
  },
  [NotificationEvents.PERFORMANCE_CYCLE_STATUS_CHANGED]: {
    subject: 'Performance cycle update',
    body: 'A performance cycle status has changed.',
  },
  [NotificationEvents.PERFORMANCE_GOAL_APPROVED]: {
    subject: 'Goal approved',
    body: 'Your goal was approved.',
  },
  [NotificationEvents.PERFORMANCE_GOAL_REJECTED]: {
    subject: 'Goal needs revision',
    body: 'Your goal was rejected.',
  },
  [NotificationEvents.PERFORMANCE_REVIEW_COMPLETED]: {
    subject: 'Performance review completed',
    body: 'Your performance review has been completed.',
  },
  [NotificationEvents.ATTENDANCE_CORRECTION_SUBMITTED]: {
    subject: 'Attendance correction request',
    body: 'A new attendance correction was submitted.',
  },
  [NotificationEvents.ATTENDANCE_CORRECTION_DECIDED]: {
    subject: 'Attendance correction decided',
    body: 'Your attendance correction was reviewed.',
  },
  [NotificationEvents.REQUISITION_SUBMITTED]: {
    subject: 'New requisition pending approval',
    body: 'A job requisition "{{title}}" was submitted for approval.',
  },
  [NotificationEvents.REQUISITION_APPROVED]: {
    subject: 'Requisition approved',
    body: 'Your job requisition "{{title}}" was approved.',
  },
  [NotificationEvents.REQUISITION_REJECTED]: {
    subject: 'Requisition rejected',
    body: 'Your job requisition "{{title}}" was rejected.',
  },
  [NotificationEvents.POSTING_PUBLISHED]: {
    subject: 'Job posting published',
    body: 'The job posting "{{title}}" is now live.',
  },
  [NotificationEvents.APPLICATION_RECEIVED]: {
    subject: 'New application received',
    body: 'A new application from {{candidateName}} was received for {{title}}.',
  },
  [NotificationEvents.APPLICATION_STAGE_CHANGED]: {
    subject: 'Application stage updated',
    body: 'Application for {{candidateName}} moved to {{toStage}}.',
  },
  [NotificationEvents.APPLICATION_REJECTED]: {
    subject: 'Application rejected',
    body: 'Application from {{candidateName}} for {{title}} was rejected.',
  },
  [NotificationEvents.APPLICATION_WITHDRAWN]: {
    subject: 'Application withdrawn',
    body: 'Application from {{candidateName}} for {{title}} was withdrawn.',
  },
  [NotificationEvents.INTERVIEW_SCHEDULED]: {
    subject: 'Interview scheduled',
    body: 'An interview with {{candidateName}} is scheduled for {{scheduledAt}}.',
  },
  [NotificationEvents.INTERVIEW_CANCELLED]: {
    subject: 'Interview cancelled',
    body: 'The interview with {{candidateName}} scheduled for {{scheduledAt}} was cancelled.',
  },
  [NotificationEvents.INTERVIEW_FEEDBACK_SUBMITTED]: {
    subject: 'Interview feedback submitted',
    body: 'Feedback was submitted for the interview with {{candidateName}}.',
  },
  [NotificationEvents.OFFER_EXTENDED]: {
    subject: 'Offer extended',
    body: 'An offer was extended to {{candidateName}} for {{title}}.',
  },
  [NotificationEvents.OFFER_RESPONDED]: {
    subject: 'Offer response received',
    body: '{{candidateName}} has {{decision}} the offer for {{title}}.',
  },
  [NotificationEvents.CANDIDATE_HIRED]: {
    subject: 'Candidate hired',
    body: '{{candidateName}} has been hired for {{title}}.',
  },
  [NotificationEvents.ONBOARDING_STARTED]: {
    subject: 'Onboarding started for {{employeeName}}',
    body: 'Onboarding for {{employeeName}} ({{employeeCode}}) has started. Joining date: {{joiningDate}}.',
  },
  [NotificationEvents.ONBOARDING_TASK_ASSIGNED]: {
    subject: 'Onboarding task assigned: {{taskTitle}}',
    body: 'You have been assigned "{{taskTitle}}" for {{employeeName}}. Due: {{dueDate}}.',
  },
  [NotificationEvents.ONBOARDING_TASK_COMPLETED]: {
    subject: 'Task completed: {{taskTitle}}',
    body: '"{{taskTitle}}" for {{employeeName}} was marked complete by {{completedBy}}.',
  },
  [NotificationEvents.ONBOARDING_COMPLETED]: {
    subject: 'Onboarding complete: {{employeeName}}',
    body: 'All required tasks for {{employeeName}} have been completed.',
  },
};
