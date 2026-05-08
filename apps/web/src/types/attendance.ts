// ─── Enums ───────────────────────────────────

export type AttendancePolicyType = 'FIXED' | 'FLEXIBLE';
export type AttendanceLogType = 'CHECK_IN' | 'CHECK_OUT';
export type AttendanceLogSource = 'WEB' | 'MOBILE' | 'MANUAL' | 'SYSTEM';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE' | 'ON_LEAVE' | 'HOLIDAY' | 'WEEKEND';
export type CorrectionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// ─── Embedded refs ──────────────────────────

export interface EmployeeRef {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
}

// ─── Attendance Policy ──────────────────────

export interface AttendancePolicy {
  id: string;
  organizationId: string;
  name: string;
  policyType: AttendancePolicyType;
  startTime: string | null;
  endTime: string | null;
  minHoursPerDay: string | null;
  coreStartTime: string | null;
  coreEndTime: string | null;
  graceMinutesLate: number;
  graceMinutesEarly: number;
  halfDayThresholdMinutes: number | null;
  workingDays: number[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { assignments?: number };
  assignments?: AttendancePolicyAssignment[];
}

export interface AttendancePolicyAssignment {
  id: string;
  employeeId: string;
  attendancePolicyId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: EmployeeRef;
  attendancePolicy?: { id: string; name: string };
}

// ─── Attendance Log ─────────────────────────

export interface AttendanceLog {
  id: string;
  organizationId: string;
  employeeId: string;
  logType: AttendanceLogType;
  timestamp: string;
  ipAddress: string | null;
  source: AttendanceLogSource;
  notes: string | null;
  // Device + location metadata captured at the moment of check-in/out
  userAgent: string | null;
  deviceType: string | null;
  latitude: string | null;
  longitude: string | null;
  accuracyMeters: string | null;
  locationLabel: string | null;
  createdAt: string;
  employee?: EmployeeRef;
}

// ─── Daily Summary ──────────────────────────

export interface AttendanceDailySummary {
  id: string;
  organizationId: string;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  firstCheckIn: string | null;
  lastCheckOut: string | null;
  totalWorkedMinutes: number;
  overtimeMinutes: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  isIpCompliant: boolean | null;
  createdAt: string;
  updatedAt: string;
  employee?: EmployeeRef;
}

// ─── Correction Request ─────────────────────

export interface AttendanceCorrectionRequest {
  id: string;
  organizationId: string;
  employeeId: string;
  date: string;
  originalCheckIn: string | null;
  originalCheckOut: string | null;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  reason: string;
  status: CorrectionRequestStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewerRemarks: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: EmployeeRef;
  reviewedBy?: EmployeeRef | null;
}

// ─── Reports ────────────────────────────────

export interface TodayReport {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  holiday: number;
  weekend: number;
}

export interface EmployeeMonthlyStats {
  employeeId: string;
  employee?: EmployeeRef;
  totalWorkedMinutes: number;
  totalOvertimeMinutes: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  onLeaveDays: number;
  holidayDays: number;
  weekendDays: number;
  summaries?: AttendanceDailySummary[];
}

export interface MonthlyReport {
  month: string;
  employees: EmployeeMonthlyStats[];
}

// ─── Payloads ───────────────────────────────

export interface CheckInPayload {
  notes?: string;
  source?: AttendanceLogSource;
  // Device metadata
  userAgent?: string;
  deviceType?: string;
  // Location metadata (opt-in client-side via navigator.geolocation)
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  locationLabel?: string;
}

export interface CreateAttendancePolicyPayload {
  name: string;
  policyType: AttendancePolicyType;
  startTime?: string;
  endTime?: string;
  minHoursPerDay?: number;
  coreStartTime?: string;
  coreEndTime?: string;
  graceMinutesLate?: number;
  graceMinutesEarly?: number;
  halfDayThresholdMinutes?: number;
  workingDays?: number[];
}

export interface AssignPolicyPayload {
  employeeId: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface CreateCorrectionPayload {
  date: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
}

export interface ReviewCorrectionPayload {
  status: 'APPROVED' | 'REJECTED';
  remarks?: string;
}

// ─── Employee attendance overrides ──────────

export interface EmployeeAttendanceOverride {
  id: string;
  employeeId: string;
  ipRestrictionExempt: boolean;
  reason: string | null;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  workingDays: number[];
  graceMinutesLate: number | null;
  graceMinutesEarly: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SetEmployeeOverridePayload {
  ipRestrictionExempt: boolean;
  reason?: string;
  scheduleStart?: string | null;
  scheduleEnd?: string | null;
  workingDays?: number[];
  graceMinutesLate?: number | null;
  graceMinutesEarly?: number | null;
}
