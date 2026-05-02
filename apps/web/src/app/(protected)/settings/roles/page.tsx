'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { useAsync, usePermission } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import {
  listRoles,
  getRoleDetail,
  listAllPermissions,
  createRole,
  updateRole,
  updateRolePermissions,
  deactivateRole,
} from '@/lib/roles-api';
import type { Role, Permission } from '@/types/role';

// ─── Toggle switch primitive ─────────────────

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-primary' : 'bg-secondary border border-border'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

// ─── Helpers ─────────────────────────────────

/** Slugify a name: lowercase, replace spaces with hyphens, strip non-alphanum-hyphen. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/** Group permissions by module. */
function groupByModule(perms: Permission[]): Record<string, Permission[]> {
  return perms.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});
}

// ─── Input class ─────────────────────────────

const inputCls =
  'block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';

// ─── Create Role Form ────────────────────────

function CreateRoleForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (roleId: string) => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Auto-derive slug from name unless user has manually edited it
  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(name));
    }
  }, [name, slugTouched]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setSubmitting(true);
    try {
      const role = await createRole({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
      });
      toast.success('Role created', role.name);
      onSuccess(role.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create role';
      setFormError(msg);
      toast.error('Failed to create role', msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="surface-glass-card rounded-2xl border-hairline p-4 mb-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-foreground">New role</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground/80">
            Name <span className="text-destructive">*</span>
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="e.g. HR Manager"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground/80">
            Slug <span className="text-destructive">*</span>
          </label>
          <input
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className={inputCls}
            placeholder="e.g. hr-manager"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-foreground/80">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls}
          placeholder="Optional description"
        />
      </div>
      {formError && <ErrorMessage message={formError} />}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 motion-press disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create role'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 motion-press"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Role List Item ───────────────────────────

function RoleListItem({
  role,
  selected,
  onClick,
}: {
  role: Role;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors motion-press ${
        selected
          ? 'bg-primary/10 ring-1 ring-primary/20'
          : 'hover:bg-secondary/60'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-medium text-foreground">{role.name}</span>
        {role.isSystem && (
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground leading-none">
            system
          </span>
        )}
        {!role.isActive && (
          <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive leading-none">
            inactive
          </span>
        )}
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {role.slug}
        {typeof role.userCount === 'number' && (
          <> &middot; {role.userCount} {role.userCount === 1 ? 'member' : 'members'}</>
        )}
      </p>
    </button>
  );
}

// ─── Detail Panel ────────────────────────────

interface DetailPanelProps {
  roleId: string;
  allPerms: Permission[];
  canManage: boolean;
  onRoleUpdated: () => void;
}

function DetailPanel({ roleId, allPerms, canManage, onRoleUpdated }: DetailPanelProps) {
  const toast = useToast();

  const {
    data: detail,
    loading,
    error,
    refetch: refetchDetail,
  } = useAsync(() => getRoleDetail(roleId), [roleId]);

  // Draft permission set — tracks local toggle changes
  const [draftPerms, setDraftPerms] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset draft when selected role changes or detail loads
  useEffect(() => {
    if (detail) {
      const codes = detail.permissions.map((p) =>
        typeof p === 'string' ? p : (p as { code: string }).code,
      );
      setDraftPerms(new Set(codes));
    }
  }, [detail?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Inline edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Deactivate state
  const [deactivating, setDeactivating] = useState(false);

  const startEdit = useCallback(() => {
    if (!detail) return;
    setEditName(detail.name);
    setEditDesc(detail.description ?? '');
    setEditError('');
    setEditing(true);
  }, [detail]);

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!detail || editSaving) return;
    setEditError('');
    setEditSaving(true);
    try {
      await updateRole(detail.id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      });
      toast.success('Role updated');
      setEditing(false);
      await refetchDetail();
      onRoleUpdated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update role';
      setEditError(msg);
      toast.error('Failed to update role', msg);
    } finally {
      setEditSaving(false);
    }
  }

  // Compute dirty: compare draftPerms with original
  const originalCodes: Set<string> = detail
    ? new Set(
        detail.permissions.map((p) =>
          typeof p === 'string' ? p : (p as { code: string }).code,
        ),
      )
    : new Set();

  const dirty =
    draftPerms !== null &&
    (draftPerms.size !== originalCodes.size ||
      [...draftPerms].some((c) => !originalCodes.has(c)));

  function togglePerm(code: string, next: boolean) {
    setDraftPerms((prev) => {
      const s = new Set(prev ?? originalCodes);
      if (next) s.add(code);
      else s.delete(code);
      return s;
    });
  }

  function cancelPerms() {
    setDraftPerms(new Set(originalCodes));
  }

  async function savePerms() {
    if (!detail || !draftPerms || saving) return;
    setSaving(true);
    try {
      await updateRolePermissions(detail.id, [...draftPerms]);
      toast.success('Permissions updated');
      await refetchDetail();
    } catch (err) {
      toast.error('Failed to save', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!detail || deactivating) return;
    setDeactivating(true);
    try {
      await deactivateRole(detail.id);
      toast.success('Role deactivated', detail.name);
      onRoleUpdated();
    } catch (err) {
      toast.error('Failed to deactivate', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDeactivating(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetchDetail} />;
  if (!detail) return null;

  const grouped = groupByModule(allPerms);
  const isReadOnly = detail.isSystem || !canManage;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {editing ? (
            <form onSubmit={saveEdit} className="space-y-2">
              <input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={`${inputCls} text-base font-bold`}
                placeholder="Role name"
              />
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className={inputCls}
                placeholder="Description (optional)"
              />
              {editError && <ErrorMessage message={editError} />}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground motion-press hover:bg-primary/90 disabled:opacity-50"
                >
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground motion-press hover:bg-secondary/80"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-foreground">{detail.name}</h3>
                {detail.isSystem && (
                  <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    System role
                  </span>
                )}
                {!detail.isActive && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    Inactive
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{detail.slug}</p>
              {detail.description && (
                <p className="mt-2 text-sm text-foreground/80">{detail.description}</p>
              )}
            </>
          )}
        </div>

        {/* Edit / Deactivate actions — only for non-system editable roles */}
        {canManage && !detail.isSystem && !editing && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={startEdit}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary motion-press"
            >
              Edit
            </button>
            {detail.isActive && (
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={deactivating}
                className="rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 motion-press disabled:opacity-50"
              >
                {deactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Permissions matrix ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Permissions</h4>
          {isReadOnly && detail.isSystem && (
            <p className="text-xs text-muted-foreground italic">
              System role permissions are managed by the platform.
            </p>
          )}
        </div>

        {allPerms.length === 0 ? (
          <p className="text-sm text-muted-foreground">No permissions defined yet.</p>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([module, perms]) => (
                <div key={module}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {module}
                  </p>
                  <div className="divide-y divide-border rounded-lg border border-border bg-card">
                    {perms.map((perm) => {
                      const enabled = draftPerms
                        ? draftPerms.has(perm.code)
                        : originalCodes.has(perm.code);
                      return (
                        <div
                          key={perm.code}
                          className="flex items-center justify-between gap-4 px-4 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {perm.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{perm.code}</p>
                            {perm.description && (
                              <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
                                {perm.description}
                              </p>
                            )}
                          </div>
                          <Toggle
                            checked={enabled}
                            onChange={(next) => togglePerm(perm.code, next)}
                            disabled={isReadOnly}
                            label={`Toggle ${perm.name}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Save / Cancel bar — only for non-system editable roles */}
        {!isReadOnly && (
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={savePerms}
              disabled={!dirty || saving}
              className="gradient-brand rounded-md px-5 py-2 text-sm font-semibold text-white shadow-glow-primary transition-all motion-press hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save permissions'}
            </button>
            <button
              type="button"
              onClick={cancelPerms}
              disabled={!dirty || saving}
              className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 motion-press disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            {dirty && (
              <p className="text-xs text-muted-foreground">You have unsaved changes.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────

export default function RolesPage() {
  const { can } = usePermission();
  const canManage = can('role.manage');
  const canRead = can('role.read') || canManage;

  const toast = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const {
    data: roles,
    loading: rolesLoading,
    error: rolesError,
    refetch: refetchRoles,
  } = useAsync(() => listRoles(), []);

  const { data: allPerms, loading: permsLoading } = useAsync(() => listAllPermissions(), []);

  // If the page isn't readable, show 403
  if (!canRead) {
    return (
      <div>
        <PageHeader
          title="Roles & Permissions"
          description="Manage roles and toggle which permissions each role grants."
        />
        <ErrorMessage
          message="You don't have permission to view this page."
          status={403}
        />
      </div>
    );
  }

  function handleRoleCreated(newRoleId: string) {
    setShowCreate(false);
    refetchRoles();
    setSelectedId(newRoleId);
  }

  function handleRoleUpdated() {
    refetchRoles();
  }

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Manage roles and toggle which permissions each role grants."
        actions={
          canManage ? (
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="motion-press rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {showCreate ? 'Cancel' : '+ New role'}
            </button>
          ) : undefined
        }
      />

      {/* Create form */}
      {showCreate && (
        <CreateRoleForm
          onSuccess={handleRoleCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Two-column layout */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* ── Left: roles list ── */}
        <div className="w-full lg:w-80 lg:shrink-0">
          <div className="rounded-xl border border-border bg-card shadow-soft">
            <div className="border-b border-border px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Roles
              </p>
            </div>
            <div className="p-2">
              {rolesLoading && <Loading />}
              {rolesError && (
                <ErrorMessage message={rolesError} onRetry={refetchRoles} />
              )}
              {!rolesLoading && !rolesError && roles && roles.length === 0 && (
                <EmptyState
                  title="No roles yet"
                  description="Create your first role to get started."
                />
              )}
              {roles && roles.length > 0 && (
                <div className="space-y-0.5">
                  {roles.map((role) => (
                    <RoleListItem
                      key={role.id}
                      role={role}
                      selected={selectedId === role.id}
                      onClick={() => setSelectedId(role.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: detail panel ── */}
        <div className="min-w-0 flex-1">
          {!selectedId ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card shadow-soft">
              <p className="text-sm text-muted-foreground">
                Select a role to view and manage its permissions.
              </p>
            </div>
          ) : permsLoading ? (
            <Loading />
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
              <DetailPanel
                key={selectedId}
                roleId={selectedId}
                allPerms={allPerms ?? []}
                canManage={canManage}
                onRoleUpdated={handleRoleUpdated}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
