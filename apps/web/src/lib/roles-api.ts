import { get, post, patch, del } from './api';
import type { Permission, Role, RoleDetail, CreateRolePayload, UpdateRolePayload } from '@/types/role';

// Re-export types for consumers that import from here directly
export type { Permission, Role, RoleDetail, CreateRolePayload, UpdateRolePayload };

// ─── Role endpoints ──────────────────────────

export function listRoles() {
  return get<Role[]>('/api/roles');
}

export function getRoleDetail(id: string) {
  return get<RoleDetail>(`/api/roles/${id}`);
}

export function listAllPermissions() {
  return get<Permission[]>('/api/roles/permissions');
}

export function createRole(payload: CreateRolePayload) {
  return post<Role>('/api/roles', payload);
}

export function updateRole(id: string, payload: UpdateRolePayload) {
  return patch<Role>(`/api/roles/${id}`, payload);
}

export function updateRolePermissions(id: string, permissionCodes: string[]) {
  return patch<RoleDetail>(`/api/roles/${id}/permissions`, { permissionCodes });
}

export function deactivateRole(id: string) {
  return del<{ message: string }>(`/api/roles/${id}`);
}
