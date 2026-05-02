// ─── Permission ──────────────────────────────

export interface Permission {
  code: string;
  name: string;
  module: string;
  description?: string | null;
}

// ─── Role (list view) ────────────────────────

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  userCount?: number;
  permissions: string[]; // permission codes
}

// ─── RoleDetail (single role w/ full permissions) ─────

export interface RoleDetail extends Omit<Role, 'permissions'> {
  permissions: Array<{ code: string; name: string; module: string }>;
}

// ─── Payloads ────────────────────────────────

export interface CreateRolePayload {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
}
