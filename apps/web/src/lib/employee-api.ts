import { get, post, put, patch, del } from './api';
import { API_BASE_URL } from './utils';
import { getToken } from './auth';
import type {
  Employee,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  UpdateSelfEmployeePayload,
  CreateEmploymentDetailPayload,
  EmploymentDetail,
  EmployeeFilters,
  Department,
  CreateDepartmentPayload,
  Designation,
  CreateDesignationPayload,
} from '@/types/employee';

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string] => e[1] !== undefined && e[1] !== '',
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// ─── Employees ──────────────────────────────

export function listEmployees(filters?: EmployeeFilters) {
  return get<Employee[]>(
    `/api/employees${qs({
      departmentId: filters?.departmentId,
      designationId: filters?.designationId,
      isActive: filters?.isActive,
      search: filters?.search,
    })}`,
  );
}

/**
 * Get the calling user's direct reports + themselves.
 * Returns [] if the user has no employee profile.
 * No permission required.
 */
export function listMyTeam() {
  return get<Employee[]>('/api/employees/my-team');
}

/**
 * Get the calling user's own employee profile, or null if no employee row
 * is linked to their account. Requires `employee.read_own`.
 */
export function getMyEmployee() {
  return get<Employee | null>('/api/employees/me');
}

/**
 * Self-service patch on the caller's own employee record. Currently only
 * supports `profileImageUrl`. Requires `employee.read_own`.
 */
export function updateMyEmployee(payload: UpdateSelfEmployeePayload) {
  return patch<Employee>('/api/employees/me', payload);
}

export function getEmployee(id: string) {
  return get<Employee>(`/api/employees/${id}`);
}

export function createEmployee(payload: CreateEmployeePayload) {
  return post<Employee>('/api/employees', payload);
}

export function updateEmployee(id: string, payload: UpdateEmployeePayload) {
  return patch<Employee>(`/api/employees/${id}`, payload);
}

export function deactivateEmployee(id: string) {
  return del<void>(`/api/employees/${id}`);
}

// ─── Employment Details ─────────────────────

export function upsertEmploymentDetail(employeeId: string, payload: CreateEmploymentDetailPayload) {
  return put<EmploymentDetail>(`/api/employees/${employeeId}/employment-detail`, payload);
}

export function updateEmploymentDetail(
  employeeId: string,
  payload: Partial<CreateEmploymentDetailPayload>,
) {
  return patch<EmploymentDetail>(`/api/employees/${employeeId}/employment-detail`, payload);
}

// ─── Departments ────────────────────────────

export function listDepartments() {
  return get<Department[]>('/api/departments');
}

export function getDepartment(id: string) {
  return get<Department>(`/api/departments/${id}`);
}

export function createDepartment(payload: CreateDepartmentPayload) {
  return post<Department>('/api/departments', payload);
}

export function updateDepartment(id: string, payload: Partial<CreateDepartmentPayload>) {
  return patch<Department>(`/api/departments/${id}`, payload);
}

export function deactivateDepartment(id: string) {
  return del<void>(`/api/departments/${id}`);
}

// ─── Designations ───────────────────────────

export function listDesignations() {
  return get<Designation[]>('/api/designations');
}

export function getDesignation(id: string) {
  return get<Designation>(`/api/designations/${id}`);
}

export function createDesignation(payload: CreateDesignationPayload) {
  return post<Designation>('/api/designations', payload);
}

export function updateDesignation(id: string, payload: Partial<CreateDesignationPayload>) {
  return patch<Designation>(`/api/designations/${id}`, payload);
}

export function deactivateDesignation(id: string) {
  return del<void>(`/api/designations/${id}`);
}

// ─── ID Card PDF ───────────────────────────
//
// Bearer auth lives in localStorage (not a cookie), so a plain <a download>
// would 401. Mirrors the `downloadPayslipPdf` helper in payroll-api.
export async function downloadEmployeeIdCard(employeeId: string, filename: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/api/employees/${employeeId}/id-card.pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Could not download ID card (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
