'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { SkeletonTable } from '@/components/ui/skeleton';
import { Loading } from '@/components/ui/loading';
import { useAsync, usePermission } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import { listMembers, assignUserRole, removeUserRole } from '@/lib/users-api';
import { listRoles } from '@/lib/roles-api';
import type { MemberWithRoles } from '@/lib/users-api';
import type { Role } from '@/types/role';

// ─── Avatar helpers ───────────────────────────

const GRADIENT_CLASSES = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-600',
  'from-teal-500 to-emerald-600',
  'from-fuchsia-500 to-violet-500',
];

function gradientFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return GRADIENT_CLASSES[hash % GRADIENT_CLASSES.length];
}

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function displayName(member: MemberWithRoles): string {
  const { account, employee } = member;
  if (employee) {
    return `${employee.firstName} ${employee.lastName}`;
  }
  return `${account.firstName} ${account.lastName}`;
}

// ─── Toggle switch primitive ──────────────────

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

// ─── Member list item ─────────────────────────

function MemberListItem({
  member,
  selected,
  onClick,
}: {
  member: MemberWithRoles;
  selected: boolean;
  onClick: () => void;
}) {
  const gradient = gradientFor(member.id);
  const name = displayName(member);
  const roleCount = member.userRoles.length;

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
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-xs font-bold text-white shadow-sm`}
        >
          {initials(member.account.firstName, member.account.lastName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">{name}</span>
            {member.employee?.employeeCode && (
              <span className="shrink-0 text-xs text-muted-foreground">
                · {member.employee.employeeCode}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">{member.account.email}</p>
        </div>
        {roleCount > 0 && (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary leading-none">
            {roleCount}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Member detail panel ──────────────────────

interface DetailPanelProps {
  member: MemberWithRoles;
  allRoles: Role[];
  rolesLoading: boolean;
  canManage: boolean;
  pending: Set<string>;
  onToggle: (userId: string, roleId: string, currentlyAssigned: boolean) => void;
}

function DetailPanel({
  member,
  allRoles,
  rolesLoading,
  canManage,
  pending,
  onToggle,
}: DetailPanelProps) {
  const gradient = gradientFor(member.id);
  const name = displayName(member);
  const assignedRoleIds = new Set(member.userRoles.map((ur) => ur.role.id));

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow-sm`}
        >
          {initials(member.account.firstName, member.account.lastName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-foreground">{name}</h3>
            {member.employee?.employeeCode && (
              <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {member.employee.employeeCode}
              </span>
            )}
            {member.isActive ? (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                Active
              </span>
            ) : (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Inactive
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{member.account.email}</p>
        </div>
      </div>

      {/* Read-only notice */}
      {!canManage && (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          You can view memberships but not edit them.
        </p>
      )}

      {/* Roles list */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-foreground">Roles</h4>
        {rolesLoading ? (
          <Loading />
        ) : allRoles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No roles defined yet.</p>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {allRoles.map((role) => {
              const assigned = assignedRoleIds.has(role.id);
              const key = `${member.id}:${role.id}`;
              const isPending = pending.has(key);
              const isSystem = role.slug === 'super_admin' || role.slug === 'hr_admin' ||
                (role as any).isSystem === true;

              return (
                <div
                  key={role.id}
                  className={`flex items-center justify-between gap-4 px-4 py-3 ${
                    !role.isActive ? 'opacity-60' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">{role.name}</span>
                      {isSystem && (
                        <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground leading-none">
                          system
                        </span>
                      )}
                      {!role.isActive && (
                        <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive leading-none">
                          inactive
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{role.slug}</p>
                  </div>
                  <Toggle
                    checked={assigned}
                    onChange={() => onToggle(member.id, role.id, assigned)}
                    disabled={!canManage || isPending}
                    label={`${assigned ? 'Remove' : 'Assign'} role ${role.name}`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────

export default function UsersPage() {
  const { can } = usePermission();
  const canManage = can('user.manage_roles');
  const canRead = can('user.read');

  const toast = useToast();

  const {
    data: members,
    error,
    errorStatus,
    loading,
    refetch: refetchMembers,
  } = useAsync(() => listMembers(), []);

  const { data: roles, loading: rolesLoading } = useAsync(() => listRoles(), []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (members && !selectedId && members.length > 0) setSelectedId(members[0].id);
  }, [members, selectedId]);

  const selected = members?.find((m) => m.id === selectedId) ?? null;

  // Track in-flight toggles per (userId, roleId)
  const [pending, setPending] = useState<Set<string>>(new Set());

  async function toggleRole(userId: string, roleId: string, currentlyAssigned: boolean) {
    const key = `${userId}:${roleId}`;
    setPending((p) => new Set(p).add(key));
    try {
      if (currentlyAssigned) {
        await removeUserRole(userId, roleId);
        toast.success('Role removed');
      } else {
        await assignUserRole(userId, roleId);
        toast.success('Role assigned');
      }
      await refetchMembers();
    } catch (err) {
      toast.error(
        currentlyAssigned ? 'Failed to remove role' : 'Failed to assign role',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(key);
        return next;
      });
    }
  }

  // Permission gate
  if (!canRead) {
    return (
      <div>
        <PageHeader
          title="Members"
          description="Assign or remove roles for each member of your organization."
        />
        <ErrorMessage
          message="You don't have permission to view this page."
          status={403}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Members"
        description="Assign or remove roles for each member of your organization."
      />

      {/* Two-column layout */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left: member list (320px) */}
        <div className="w-full lg:w-80 lg:shrink-0">
          <div className="rounded-xl border border-border bg-card shadow-soft">
            <div className="border-b border-border px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Members
              </p>
            </div>
            <div className="p-2">
              {loading && <SkeletonTable rows={6} cols={3} />}
              {error && (
                <ErrorMessage
                  message={error}
                  status={errorStatus}
                  onRetry={refetchMembers}
                />
              )}
              {!loading && !error && members && members.length === 0 && (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  No members found.
                </p>
              )}
              {!loading && !error && members && members.length > 0 && (
                <div className="space-y-0.5">
                  {members.map((member) => (
                    <MemberListItem
                      key={member.id}
                      member={member}
                      selected={selectedId === member.id}
                      onClick={() => setSelectedId(member.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: detail panel */}
        <div className="min-w-0 flex-1">
          {!selected ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card shadow-soft">
              <p className="text-sm text-muted-foreground">
                Select a member to manage their roles.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
              <DetailPanel
                key={selected.id}
                member={selected}
                allRoles={roles ?? []}
                rolesLoading={rolesLoading}
                canManage={canManage}
                pending={pending}
                onToggle={toggleRole}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
