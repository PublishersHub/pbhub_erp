import { get, post, put, patch, del } from './api';
import type {
  Employee,
  CreateEmployeePayload,
  UpdateEmployeePayload,
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
