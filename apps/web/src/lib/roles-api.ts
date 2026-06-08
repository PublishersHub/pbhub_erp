import { get } from './api';

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
}

export interface Permission {
  code: string;
  name: string;
  module: string;
}

export function listRoles() {
  return get<Role[]>('/api/roles');
}

export function listPermissions() {
  return get<Permission[]>('/api/roles/permissions');
}
