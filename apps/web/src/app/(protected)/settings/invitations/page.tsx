'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSearch } from '@/components/ui/table-search';
import { LoadingButton } from '@/components/ui/loading-button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useAsync, usePermission } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import {
  listInvitations,
  createInvitation,
  revokeInvitation,
  type Invitation,
  type CreatedInvitation,
} from '@/lib/invitations-api';
import { listRoles } from '@/lib/roles-api';
import type { Role } from '@/types/role';

// ─── Status badge ─────────────────────────────

function StatusBadge({ status }: { status: Invitation['status'] }) {
  const styles: Record<Invitation['status'], string> = {
    PENDING: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    ACCEPTED: 'bg-success/10 text-success border border-success/20',
    REVOKED: 'bg-destructive/10 text-destructive border border-destructive/20',
    EXPIRED: 'bg-secondary text-muted-foreground border border-border',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Copy button ──────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-card motion-press"
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}

// ─── Send invitation form ─────────────────────

function SendInvitationForm({
  roles,
  rolesLoading,
  onSuccess,
}: {
  roles: Role[];
  rolesLoading: boolean;
  onSuccess: (inv: CreatedInvitation) => void;
}) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  function toggleRole(id: string) {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const inv = await createInvitation({
        email,
        firstName,
        lastName,
        roleIds: [...selectedRoleIds],
      });
      toast.success('Invitation sent', `${email} has been invited.`);
      setEmail('');
      setFirstName('');
      setLastName('');
      setSelectedRoleIds(new Set());
      onSuccess(inv);
    } catch (err) {
      toast.error('Failed to send invitation', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors duration-150 disabled:opacity-60';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            First name
          </label>
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Jane"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Last name
          </label>
          <input
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Smith"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Email address
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@company.com"
          className={inputClass}
        />
      </div>

      {/* Roles multi-select */}
      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Roles to assign on acceptance
        </label>
        {rolesLoading ? (
          <p className="text-xs text-muted-foreground">Loading roles…</p>
        ) : roles.length === 0 ? (
          <p className="text-xs text-muted-foreground">No roles available.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {roles.filter((r) => r.isActive).map((role) => {
              const checked = selectedRoleIds.has(role.id);
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors motion-press ${
                    checked
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {checked && (
                    <span className="mr-1">&#10003;</span>
                  )}
                  {role.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <LoadingButton type="submit" loading={submitting} loadingText="Sending…">
        Send invitation
      </LoadingButton>
    </form>
  );
}

// ─── Last created card ────────────────────────

function LastCreatedCard({ invitation }: { invitation: CreatedInvitation }) {
  return (
    <div className="rounded-lg border border-success/20 bg-success/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4 text-success shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm font-medium text-success">
          Invitation created for {invitation.email}
        </p>
      </div>
      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">Invite link (dev — copy/paste):</p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded bg-background border border-border px-2.5 py-1.5 text-xs text-foreground">
            {invitation.inviteLink}
          </code>
          <CopyButton text={invitation.inviteLink} label="Copy link" />
        </div>
      </div>
    </div>
  );
}

// ─── Invitations table ────────────────────────

function InvitationsTable({
  invitations,
  totalAll,
  loading,
  error,
  canManage,
  search,
  onRevoke,
  onRetry,
  onInvite,
}: {
  invitations: Invitation[] | undefined;
  totalAll: number;
  loading: boolean;
  error: string | null;
  canManage: boolean;
  search: string;
  onRevoke: (inv: Invitation) => void;
  onRetry: () => void;
  onInvite?: () => void;
}) {
  if (loading) return <SkeletonTable rows={4} cols={5} />;
  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;

  if (totalAll === 0) {
    return (
      <EmptyState
        variant="inbox"
        title="No invitations yet"
        description="Send an invitation to a teammate to join your organization."
        cta={onInvite ? { label: 'Invite a user', onClick: onInvite } : undefined}
      />
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
        {search ? `No invitations match "${search}".` : 'No invitations match the current filter.'}
      </p>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Roles</th>
              <th className="px-4 py-3 font-medium">Invited by</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canManage && <th className="px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invitations.map((inv) => {
              const invitedBy = inv.invitedByUser?.account;
              const expiresDate = new Date(inv.expiresAt);
              const isExpiredOrRevoked = inv.status === 'REVOKED' || inv.status === 'EXPIRED';
              return (
                <tr key={inv.id} className={`transition-colors hover:bg-secondary/20 ${isExpiredOrRevoked ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-medium text-foreground">{inv.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.firstName} {inv.lastName}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {inv.roleAssignments.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        inv.roleAssignments.map((ra) => (
                          <span
                            key={ra.role.id}
                            className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                          >
                            {ra.role.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {invitedBy ? `${invitedBy.firstName} ${invitedBy.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {expiresDate.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      {inv.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => onRevoke(inv)}
                          className="rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors motion-press"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="block md:hidden space-y-3 p-3">
        {invitations.map((inv) => {
          const invitedBy = inv.invitedByUser?.account;
          const expiresDate = new Date(inv.expiresAt);
          const isExpiredOrRevoked = inv.status === 'REVOKED' || inv.status === 'EXPIRED';
          const initials = `${inv.firstName.charAt(0)}${inv.lastName.charAt(0)}`.toUpperCase();
          return (
            <div
              key={inv.id}
              className={`rounded-xl border border-border bg-card p-3 shadow-soft ${isExpiredOrRevoked ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/60 text-xs font-bold text-white shadow-sm">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {inv.firstName} {inv.lastName}
                    </p>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{inv.email}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Expires {expiresDate.toLocaleDateString()}
                    {invitedBy ? ` · by ${invitedBy.firstName} ${invitedBy.lastName}` : ''}
                  </p>
                  {inv.roleAssignments.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {inv.roleAssignments.map((ra) => (
                        <span
                          key={ra.role.id}
                          className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                        >
                          {ra.role.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {canManage && inv.status === 'PENDING' && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onRevoke(inv)}
                    className="rounded-md border border-destructive/30 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors motion-press"
                  >
                    Revoke
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────

export default function InvitationsPage() {
  useEffect(() => {
    document.title = 'Invitations · PbHub';
  }, []);

  const { can } = usePermission();
  const canManage = can('user.create') || can('user.manage_roles');
  const toast = useToast();
  const confirm = useConfirm();

  const {
    data: invitations,
    loading,
    error,
    refetch: refetchInvitations,
  } = useAsync(() => listInvitations(), []);

  const { data: roles, loading: rolesLoading } = useAsync(() => listRoles(), []);

  const [lastCreated, setLastCreated] = useState<CreatedInvitation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  async function handleRevoke(inv: Invitation) {
    const ok = await confirm({
      title: 'Revoke invitation?',
      description: `This will revoke the invitation sent to ${inv.email}. They won't be able to use the link to join.`,
      confirmLabel: 'Revoke',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await revokeInvitation(inv.id);
      toast.success('Invitation revoked');
      await refetchInvitations();
    } catch (err) {
      toast.error('Failed to revoke', err instanceof Error ? err.message : 'Unknown error');
    }
  }

  function focusInviteForm() {
    if (typeof document === 'undefined') return;
    const el = document.querySelector<HTMLInputElement>(
      'input[placeholder="jane@company.com"]',
    );
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  const filteredInvitations = useMemo(() => {
    if (!invitations) return undefined;
    let list = invitations;
    if (statusFilter) list = list.filter((i) => i.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.email.toLowerCase().includes(q) ||
          `${i.firstName} ${i.lastName}`.toLowerCase().includes(q),
      );
    }
    return list;
  }, [invitations, statusFilter, search]);

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Invitations" description="Invite new members to your organization." />
        <ErrorMessage message="You don't have permission to manage invitations." status={403} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Invitations"
        description="Invite new members to your organization via email."
      />

      {/* Send invitation section */}
      <div className="rounded-xl border border-border bg-card shadow-soft">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">Send invitation</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            The recipient will receive an email with a link to set their password and join.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <SendInvitationForm
            roles={roles ?? []}
            rolesLoading={rolesLoading}
            onSuccess={(inv) => {
              setLastCreated(inv);
              refetchInvitations();
            }}
          />
          {lastCreated && <LastCreatedCard invitation={lastCreated} />}
        </div>
      </div>

      {/* Invitations list section */}
      <div className="rounded-xl border border-border bg-card shadow-soft">
        <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Invitations</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {invitations ? `${invitations.length} total` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TableSearch
              value={search}
              onChange={setSearch}
              placeholder="Search invitations…"
              className="w-full sm:w-64"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REVOKED">Revoked</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>
        <InvitationsTable
          invitations={filteredInvitations}
          totalAll={invitations?.length ?? 0}
          loading={loading}
          error={error}
          canManage={canManage}
          search={search}
          onRevoke={handleRevoke}
          onRetry={refetchInvitations}
          onInvite={focusInviteForm}
        />
      </div>
    </div>
  );
}
