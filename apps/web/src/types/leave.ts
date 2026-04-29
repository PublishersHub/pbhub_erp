// ─── Enums ───────────────────────────────────

export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ApproverRole = 'MANAGER' | 'HR';
export type ApprovalAction = 'APPROVED' | 'REJECTED';
export type LeaveDayType = 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF';

// ─── Embedded refs ──────────────────────────

export interface EmployeeRef {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
}

export interface LeavePolicyRef {
  id: string;
  name: string;
  code: string;
}

// ─── Leave Policy ───────────────────────────

export interface LeavePolicy {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  annualQuotaDefault: string; // Decimal as string
  carryForwardLimit: string;
  maxConsecutiveDays: number | null;
  allowHalfDay: boolean;
  requiresApproval: boolean;
  isPaid: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { assignments?: number };
  assignments?: LeavePolicyAssignment[];
}

export interface LeavePolicyAssignment {
  id: string;
  organizationId: string;
  employeeId: string;
  leavePolicyId: string;
  customAnnualQuota: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: EmployeeRef;
}

// ─── Leave Balance ──────────────────────────

export interface LeaveBalance {
  id: string;
  organizationId: string;
  employeeId: string;
  leavePolicyId: string;
  year: number;
  totalEntitled: string;
  used: string;
  carriedForward: string;
  adjustments: string;
  balance: string;
  createdAt: string;
  updatedAt: string;
  leavePolicy?: LeavePolicyRef;
  employee?: EmployeeRef;
}

// ─── Leave Request ──────────────────────────

export interface LeaveRequestDay {
  id: string;
  leaveRequestId: string;
  date: string;
  dayType: LeaveDayType;
  days: string;
  createdAt: string;
}

export interface LeaveApprovalActionRecord {
  id: string;
  leaveRequestId: string;
  approverEmployeeId: string;
  approverRole: ApproverRole;
  action: ApprovalAction;
  remarks: string | null;
  createdAt: string;
  approverEmployee?: EmployeeRef;
}

export interface LeaveRequest {
  id: string;
  organizationId: string;
  employeeId: string;
  leavePolicyId: string;
  startDate: string;
  endDate: string;
  totalDays: string;
  isHalfDay: boolean;
  reason: string | null;
  status: LeaveRequestStatus;
  submittedAt: string;
  managerDecisionAt: string | null;
  hrDecisionAt: string | null;
  finalDecisionAt: string | null;
  finalDecisionById: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: EmployeeRef;
  leavePolicy?: LeavePolicyRef;
  finalDecisionBy?: EmployeeRef | null;
  days?: LeaveRequestDay[];
  approvalActions?: LeaveApprovalActionRecord[];
}

// ─── Holiday ────────────────────────────────

export interface Holiday {
  id: string;
  organizationId: string;
  name: string;
  date: string;
  isOptional: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Payloads ───────────────────────────────

export interface CreateLeavePolicyPayload {
  name: string;
  code: string;
  description?: string;
  annualQuotaDefault: number;
  carryForwardLimit?: number;
  maxConsecutiveDays?: number;
  allowHalfDay?: boolean;
  requiresApproval?: boolean;
  isPaid?: boolean;
}

export interface AssignLeavePolicyPayload {
  employeeId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  customAnnualQuota?: number;
}

export interface AdjustBalancePayload {
  employeeId: string;
  leavePolicyId: string;
  year: number;
  adjustment: number;
}

export interface LeaveRequestDayPayload {
  date: string;
  dayType: LeaveDayType;
}

export interface CreateLeaveRequestPayload {
  leavePolicyId: string;
  startDate: string;
  endDate: string;
  isHalfDay?: boolean;
  reason?: string;
  days?: LeaveRequestDayPayload[];
}

export interface ReviewLeaveRequestPayload {
  action: 'APPROVED' | 'REJECTED';
  remarks?: string;
}

export interface CancelLeaveRequestPayload {
  cancelReason?: string;
}

export interface CreateHolidayPayload {
  name: string;
  date: string;
  isOptional?: boolean;
}
