import { get, post, patch, del, put } from './api';
import type {
  AttendanceLog,
  AttendanceDailySummary,
  CheckInPayload,
  AttendancePolicy,
  CreateAttendancePolicyPayload,
  AttendancePolicyAssignment,
  AssignPolicyPayload,
  AttendanceCorrectionRequest,
  CreateCorrectionPayload,
  ReviewCorrectionPayload,
  CorrectionRequestStatus,
  TodayReport,
  EmployeeMonthlyStats,
  EmployeeAttendanceOverride,
  SetEmployeeOverridePayload,
} from '@/types/attendance';

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string] => e[1] !== undefined && e[1] !== '',
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// ─── Check-in / Check-out ───────────────────

export function checkIn(payload?: CheckInPayload) {
  return post<AttendanceLog>('/api/attendance/check-in', payload);
}

export function checkOut(payload?: CheckInPayload) {
  return post<AttendanceLog>('/api/attendance/check-out', payload);
}

// ─── My Attendance ──────────────────────────

export function getMyToday() {
  return get<{ summary: AttendanceDailySummary | null; logs: AttendanceLog[] }>(
    '/api/attendance/my/today',
  );
}

export function getMyLogs(from: string, to: string) {
  return get<AttendanceLog[]>(`/api/attendance/my/logs?from=${from}&to=${to}`);
}

export function getMySummaries(from: string, to: string) {
  return get<AttendanceDailySummary[]>(`/api/attendance/my/summaries?from=${from}&to=${to}`);
}

export function getMyPolicy() {
  return get<AttendancePolicy | null>('/api/attendance/my-policy');
}

// ─── Admin Attendance ───────────────────────

export function getAllSummaries(filters?: { employeeId?: string; from?: string; to?: string }) {
  return get<AttendanceDailySummary[]>(
    `/api/attendance/summaries${qs({
      employeeId: filters?.employeeId,
      from: filters?.from,
      to: filters?.to,
    })}`,
  );
}

export function getAllLogs(filters?: { employeeId?: string; from?: string; to?: string }) {
  return get<AttendanceLog[]>(
    `/api/attendance/logs${qs({
      employeeId: filters?.employeeId,
      from: filters?.from,
      to: filters?.to,
    })}`,
  );
}

// ─── Policies ───────────────────────────────

export function listAttendancePolicies() {
  return get<AttendancePolicy[]>('/api/attendance-policies');
}

export function getAttendancePolicy(id: string) {
  return get<AttendancePolicy>(`/api/attendance-policies/${id}`);
}

export function createAttendancePolicy(payload: CreateAttendancePolicyPayload) {
  return post<AttendancePolicy>('/api/attendance-policies', payload);
}

export function updateAttendancePolicy(
  id: string,
  payload: Partial<CreateAttendancePolicyPayload & { isActive: boolean }>,
) {
  return patch<AttendancePolicy>(`/api/attendance-policies/${id}`, payload);
}

export function deactivateAttendancePolicy(id: string) {
  return del<AttendancePolicy>(`/api/attendance-policies/${id}`);
}

export function assignAttendancePolicy(policyId: string, payload: AssignPolicyPayload) {
  return post<AttendancePolicyAssignment>(
    `/api/attendance-policies/${policyId}/assignments`,
    payload,
  );
}

export function removeAttendancePolicyAssignment(policyId: string, assignmentId: string) {
  return del<AttendancePolicyAssignment>(
    `/api/attendance-policies/${policyId}/assignments/${assignmentId}`,
  );
}

// ─── Corrections ────────────────────────────

export function createCorrection(payload: CreateCorrectionPayload) {
  return post<AttendanceCorrectionRequest>('/api/attendance-corrections', payload);
}

export function getMyCorrections() {
  return get<AttendanceCorrectionRequest[]>('/api/attendance-corrections/my');
}

export function getAllCorrections(status?: CorrectionRequestStatus) {
  return get<AttendanceCorrectionRequest[]>(
    `/api/attendance-corrections${qs({ status })}`,
  );
}

export function reviewCorrection(id: string, payload: ReviewCorrectionPayload) {
  return patch<AttendanceCorrectionRequest>(`/api/attendance-corrections/${id}/review`, payload);
}

// ─── Reports ────────────────────────────────

export function getTodayReport() {
  return get<TodayReport>('/api/attendance-reports/today');
}

export function getMonthlyReport(month: string) {
  return get<{ month: string; employees: EmployeeMonthlyStats[] }>(
    `/api/attendance-reports/month?month=${month}`,
  );
}

export function getEmployeeMonthlyReport(employeeId: string, month: string) {
  return get<EmployeeMonthlyStats>(
    `/api/attendance-reports/employee/${employeeId}/month?month=${month}`,
  );
}

// ─── Employee Attendance Overrides ──────────

export function getEmployeeAttendanceOverride(employeeId: string) {
  return get<EmployeeAttendanceOverride | null>(
    `/api/employees/${employeeId}/attendance-override`,
  );
}

export function setEmployeeAttendanceOverride(
  employeeId: string,
  payload: SetEmployeeOverridePayload,
) {
  return put<EmployeeAttendanceOverride>(
    `/api/employees/${employeeId}/attendance-override`,
    payload,
  );
}

export function removeEmployeeAttendanceOverride(employeeId: string) {
  return del<EmployeeAttendanceOverride>(
    `/api/employees/${employeeId}/attendance-override`,
  );
}
