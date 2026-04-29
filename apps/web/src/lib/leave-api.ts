import { get, post, patch, del } from './api';
import type {
  LeavePolicy,
  CreateLeavePolicyPayload,
  LeavePolicyAssignment,
  AssignLeavePolicyPayload,
  LeaveBalance,
  AdjustBalancePayload,
  LeaveRequest,
  CreateLeaveRequestPayload,
  ReviewLeaveRequestPayload,
  CancelLeaveRequestPayload,
  LeaveRequestStatus,
  Holiday,
  CreateHolidayPayload,
} from '@/types/leave';

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string] => e[1] !== undefined && e[1] !== '',
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// ─── Leave Policies ─────────────────────────

export function listLeavePolicies() {
  return get<LeavePolicy[]>('/api/leave-policies');
}

export function getLeavePolicy(id: string) {
  return get<LeavePolicy>(`/api/leave-policies/${id}`);
}

export function createLeavePolicy(payload: CreateLeavePolicyPayload) {
  return post<LeavePolicy>('/api/leave-policies', payload);
}

export function updateLeavePolicy(id: string, payload: Partial<CreateLeavePolicyPayload>) {
  return patch<LeavePolicy>(`/api/leave-policies/${id}`, payload);
}

export function deactivateLeavePolicy(id: string) {
  return del<void>(`/api/leave-policies/${id}`);
}

export function assignLeavePolicy(policyId: string, payload: AssignLeavePolicyPayload) {
  return post<LeavePolicyAssignment>(`/api/leave-policies/${policyId}/assignments`, payload);
}

export function removeAssignment(policyId: string, assignmentId: string) {
  return del<void>(`/api/leave-policies/${policyId}/assignments/${assignmentId}`);
}

// ─── Leave Balances ─────────────────────────

export function getMyBalances(year: number) {
  return get<LeaveBalance[]>(`/api/leave-balances/my?year=${year}`);
}

export function getEmployeeBalances(employeeId: string, year: number) {
  return get<LeaveBalance[]>(`/api/leave-balances/employee/${employeeId}?year=${year}`);
}

export function initializeBalances(employeeId: string, year: number) {
  return post<LeaveBalance[]>(`/api/leave-balances/initialize/${employeeId}?year=${year}`);
}

export function adjustBalance(payload: AdjustBalancePayload) {
  return post<LeaveBalance>('/api/leave-balances/adjust', payload);
}

// ─── Leave Requests ─────────────────────────

export function createLeaveRequest(payload: CreateLeaveRequestPayload) {
  return post<LeaveRequest>('/api/leave-requests', payload);
}

export function getMyLeaveRequests(status?: LeaveRequestStatus) {
  return get<LeaveRequest[]>(`/api/leave-requests/my${qs({ status })}`);
}

export function getPendingApprovals() {
  return get<LeaveRequest[]>('/api/leave-requests/pending');
}

export function getAllLeaveRequests(status?: LeaveRequestStatus) {
  return get<LeaveRequest[]>(`/api/leave-requests${qs({ status })}`);
}

export function getLeaveRequest(id: string) {
  return get<LeaveRequest>(`/api/leave-requests/${id}`);
}

export function reviewLeaveRequest(id: string, payload: ReviewLeaveRequestPayload) {
  return patch<LeaveRequest>(`/api/leave-requests/${id}/review`, payload);
}

export function cancelLeaveRequest(id: string, payload?: CancelLeaveRequestPayload) {
  return patch<LeaveRequest>(`/api/leave-requests/${id}/cancel`, payload);
}

// ─── Holidays ───────────────────────────────

export function listHolidays(year?: number) {
  return get<Holiday[]>(`/api/holidays${qs({ year: year?.toString() })}`);
}

export function getHoliday(id: string) {
  return get<Holiday>(`/api/holidays/${id}`);
}

export function createHoliday(payload: CreateHolidayPayload) {
  return post<Holiday>('/api/holidays', payload);
}

export function updateHoliday(id: string, payload: Partial<CreateHolidayPayload & { isActive: boolean }>) {
  return patch<Holiday>(`/api/holidays/${id}`, payload);
}

export function deactivateHoliday(id: string) {
  return del<void>(`/api/holidays/${id}`);
}
