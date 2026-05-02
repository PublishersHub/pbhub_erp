import { get, post, del } from './api';

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

export function assignUserRole(userId: string, roleId: string) {
  return post<unknown>(`/api/users/${userId}/roles`, { roleId });
}

export function removeUserRole(userId: string, roleId: string) {
  return del<{ message: string }>(`/api/users/${userId}/roles/${roleId}`);
}
