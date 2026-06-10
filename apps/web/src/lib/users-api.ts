import { get, post, patch, del } from './api';

export interface AccountSlim {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface EmployeeSlim {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

export interface RoleSlim {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface MemberWithRoles {
  id: string;          // User membership id
  account: AccountSlim;
  employee: EmployeeSlim | null;
  isActive: boolean;
  userRoles: Array<{ role: RoleSlim }>;
}

export function listMembers() {
  return get<MemberWithRoles[]>('/api/users');
}

export interface OrphanEmployee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  personalEmail: string | null;
  department: { id: string; name: string } | null;
  designation: { id: string; name: string } | null;
}

export function listOrphanEmployees() {
  return get<OrphanEmployee[]>('/api/users/orphan-employees');
}

export function assignUserRole(userId: string, roleId: string) {
  return post<unknown>(`/api/users/${userId}/roles`, { roleId });
}

export function removeUserRole(userId: string, roleId: string) {
  return del<{ message: string }>(`/api/users/${userId}/roles/${roleId}`);
}

export function adminSetUserPassword(userId: string, password: string) {
  return patch<{ ok: boolean }>(`/api/users/${userId}/password`, { password });
}

export function setUserActive(userId: string, isActive: boolean) {
  return patch<{ ok: boolean; isActive: boolean }>(`/api/users/${userId}/active`, { isActive });
}

export function updateUserName(userId: string, firstName: string, lastName: string) {
  return patch<{ ok: boolean }>(`/api/users/${userId}/name`, { firstName, lastName });
}
