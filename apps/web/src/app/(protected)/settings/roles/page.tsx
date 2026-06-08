'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { useAsync } from '@/lib/hooks';
import { listRoles, listPermissions, type Role, type Permission } from '@/lib/roles-api';

const SUPER_ADMIN_SLUG = 'super_admin';

export default function RolesPage() {
  const { data: roles, error: rolesErr, loading: rolesLoading, refetch } = useAsync(() => listRoles());
  const { data: permissions, loading: permsLoading } = useAsync(() => listPermissions());

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const selectedRole = useMemo<Role | null>(
    () => roles?.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const permissionsByModule = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    (permissions ?? []).forEach((p) => {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    });
    return grouped;
  }, [permissions]);

  if (rolesLoading) return <Loading />;
  if (rolesErr) return <ErrorMessage message={rolesErr} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Read-only overview of system roles and the permissions granted to each."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Roles list */}
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="border-b bg-gray-50 px-4 py-2 text-xs font-semibold uppercase text-gray-500">
            Roles
          </div>
          {(roles ?? []).length === 0 ? (
            <EmptyState title="No roles" description="No roles defined yet." />
          ) : (
            <ul className="divide-y">
              {(roles ?? []).map((role) => {
                const isSuperAdmin = role.slug === SUPER_ADMIN_SLUG;
                const isActive = selectedRoleId === role.id;
                return (
                  <li key={role.id}>
                    <button
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`flex w-full items-start justify-between gap-2 px-4 py-3 text-left transition-colors ${
                        isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {role.name}
                          {isSuperAdmin && (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                              Protected
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-gray-500">{role.slug}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {role.userCount}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Role detail */}
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          {!selectedRole ? (
            <EmptyState
              title="Select a role"
              description="Click a role on the left to view its permissions."
            />
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedRole.name}</h3>
                  {selectedRole.description && (
                    <p className="mt-1 text-sm text-gray-500">{selectedRole.description}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">slug: {selectedRole.slug}</p>
                </div>
                {selectedRole.slug === SUPER_ADMIN_SLUG ? (
                  <span className="rounded-md bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                    Built-in role · not editable
                  </span>
                ) : (
                  <span className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    Read-only view
                  </span>
                )}
              </div>

              {permsLoading ? (
                <Loading />
              ) : (
                <div className="space-y-4">
                  {Object.keys(permissionsByModule)
                    .sort()
                    .map((mod) => {
                      const modulePerms = permissionsByModule[mod];
                      const granted = modulePerms.filter((p) => selectedRole.permissions.includes(p.code));
                      if (granted.length === 0) return null;
                      return (
                        <div key={mod}>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {mod}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {granted.map((p) => (
                              <span
                                key={p.code}
                                title={p.code}
                                className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                              >
                                {p.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
