'use client';

import { useState } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmployeeAvatar } from '@/components/ui/employee-avatar';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/toast';
import { useAsync, usePermission } from '@/lib/hooks';
import { useAuth } from '@/context/auth-context';
import { getEmployee, deactivateEmployee, reactivateEmployee, downloadEmployeeIdCard } from '@/lib/employee-api';
import { createInvitation } from '@/lib/invitations-api';
import { listRoles } from '@/lib/roles-api';
import { adminSetUserPassword } from '@/lib/users-api';
import { formatDate, employeeName } from '@/lib/format';
import { PerformanceNotesCard } from '@/components/performance-notes-card';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = usePermission();
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const { data: emp, error, loading, refetch } = useAsync(() => getEmployee(id), [id]);
  const [actionError, setActionError] = useState('');
  const [acting, setActing] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);

  useDocumentTitle(emp ? `${emp.firstName} ${emp.lastName}` : 'Employee');

  async function handleDownloadIdCard() {
    if (!emp || downloadingCard) return;
    setDownloadingCard(true);
    try {
      await downloadEmployeeIdCard(emp.id, `id-card-${emp.employeeCode}.pdf`);
    } catch (err) {
      toast.error(
        'Failed to download ID card',
        err instanceof Error ? err.message : 'Please try again',
      );
    } finally {
      setDownloadingCard(false);
    }
  }

  async function handleDeactivate() {
    if (!emp) return;
    const ok = await confirm({
      title: 'Deactivate employee?',
      description: `This will mark ${emp.firstName} ${emp.lastName} as inactive. You can reactivate later.`,
      confirmLabel: 'Deactivate',
      tone: 'warning',
    });
    if (!ok) return;
    setActionError('');
    setActing(true);
    try {
      await deactivateEmployee(id);
      toast.success('Employee deactivated', `${emp.firstName} ${emp.lastName}`);
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      setActionError(msg);
      toast.error('Failed to deactivate', msg);
    } finally {
      setActing(false);
    }
  }

  async function handleReactivate() {
    if (!emp) return;
    setActionError('');
    setActing(true);
    try {
      await reactivateEmployee(id);
      toast.success('Employee reactivated', `${emp.firstName} ${emp.lastName}`);
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      setActionError(msg);
      toast.error('Failed to reactivate', msg);
    } finally {
      setActing(false);
    }
  }

  // ── Set-password flow (for employees with a linked User) ────────
  const [pwOpen, setPwOpen] = useState(false);
  const [pwValue, setPwValue] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  async function submitSetPassword() {
    if (!emp?.userId || pwBusy) return;
    if (pwValue.length < 8) {
      toast.error('Password too short', 'Use at least 8 characters');
      return;
    }
    setPwBusy(true);
    try {
      await adminSetUserPassword(emp.userId, pwValue);
      toast.success('Password set', `${emp.firstName} ${emp.lastName} will need to log in again`);
      setPwOpen(false);
      setPwValue('');
    } catch (err) {
      toast.error('Failed to set password', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPwBusy(false);
    }
  }

  // ── Invite-to-login flow ────────────────────────────────────────
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState<string>('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const { data: invitableRoles } = useAsync(() => listRoles(), []);

  function openInvite() {
    if (!emp) return;
    setInviteEmail(emp.personalEmail ?? '');
    setInviteRoleId(invitableRoles?.find((r) => r.slug === 'employee')?.id ?? '');
    setInviteOpen(true);
  }

  async function submitInvite() {
    if (!emp || inviteBusy) return;
    if (!inviteEmail || !inviteRoleId) {
      toast.error('Email and role are required');
      return;
    }
    setInviteBusy(true);
    try {
      await createInvitation({
        email: inviteEmail.trim(),
        firstName: emp.firstName,
        lastName: emp.lastName,
        roleIds: [inviteRoleId],
        employeeId: emp.id,
      });
      toast.success('Invitation sent', 'They will receive an email with a setup link.');
      setInviteOpen(false);
      refetch();
    } catch (err) {
      toast.error('Failed to send invitation', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setInviteBusy(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!emp) return null;

  return (
    <div>
      <PageHeader
        title={`${emp.firstName} ${emp.lastName}`}
        backHref="/employees"
        actions={
          <div className="flex items-center gap-2">
            {emp.isActive ? (
              <span className="inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                Inactive
              </span>
            )}
          </div>
        }
      />

      {/* Identity row — avatar + headline */}
      <div className="mb-6 flex items-center gap-4 rounded-lg border border-border bg-card p-5 shadow-soft">
        <EmployeeAvatar
          size={64}
          firstName={emp.firstName}
          lastName={emp.lastName}
          imageUrl={emp.profileImageUrl}
          seed={emp.id}
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">
            {emp.firstName} {emp.lastName}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {emp.designation?.name ?? 'No designation'}
            {emp.department?.name ? ` · ${emp.department.name}` : ''}
          </p>
          {emp.employeeCode && (
            <p className="mt-0.5 text-xs text-muted-foreground/70">{emp.employeeCode}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">
              Basic Information
            </h3>
            <dl>
              <DetailRow label="Employee Code">{emp.employeeCode}</DetailRow>
              <DetailRow label="Full Name">
                {emp.firstName} {emp.lastName}
              </DetailRow>
              <DetailRow label="Gender">{emp.gender ?? '—'}</DetailRow>
              <DetailRow label="Date of Birth">{formatDate(emp.dateOfBirth)}</DetailRow>
              <DetailRow label="Phone">{emp.phone}</DetailRow>
              <DetailRow label="Personal Email">{emp.personalEmail}</DetailRow>
            </dl>
          </div>

          {/* Organization Info */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Organization</h3>
            <dl>
              <DetailRow label="Department">{emp.department?.name}</DetailRow>
              <DetailRow label="Designation">{emp.designation?.name}</DetailRow>
              <DetailRow label="Reporting Manager">
                {emp.reportingManager ? (
                  <Link
                    href={`/employees/${emp.reportingManager.id}`}
                    className="text-primary hover:underline"
                  >
                    {employeeName(emp.reportingManager)}
                  </Link>
                ) : (
                  '—'
                )}
              </DetailRow>
            </dl>
          </div>

          {/* Employment Detail */}
          {emp.employmentDetail && (
            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
              <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">
                Employment Detail
              </h3>
              <dl>
                <DetailRow label="Employment Type">
                  <StatusBadge status={emp.employmentDetail.employmentType} />
                </DetailRow>
                <DetailRow label="Employment Status">
                  <StatusBadge status={emp.employmentDetail.employmentStatus} />
                </DetailRow>
                <DetailRow label="Joining Date">
                  {formatDate(emp.employmentDetail.joiningDate)}
                </DetailRow>
                <DetailRow label="Confirmation Date">
                  {formatDate(emp.employmentDetail.confirmationDate)}
                </DetailRow>
                <DetailRow label="Probation End Date">
                  {formatDate(emp.employmentDetail.probationEndDate)}
                </DetailRow>
                {emp.employmentDetail.resignationDate && (
                  <DetailRow label="Resignation Date">
                    {formatDate(emp.employmentDetail.resignationDate)}
                  </DetailRow>
                )}
                {emp.employmentDetail.lastWorkingDate && (
                  <DetailRow label="Last Working Date">
                    {formatDate(emp.employmentDetail.lastWorkingDate)}
                  </DetailRow>
                )}
              </dl>
            </div>
          )}

          {/* Performance Notes — visible to managers/HR (perf.review) and to the
              subject themselves (read-only public notes via the API rule). */}
          {(can('performance.review') ||
            can('performance.manage') ||
            emp.userId === user?.user?.id) && (
            <PerformanceNotesCard
              employeeId={emp.id}
              canCompose={can('performance.review') || can('performance.manage')}
            />
          )}

          {/* Direct Reports */}
          {emp.directReports && emp.directReports.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
              <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">
                Direct Reports ({emp.directReports.length})
              </h3>
              <div className="space-y-2">
                {emp.directReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/employees/${report.id}`}
                    className="block rounded-md border border-border px-3 py-2 text-sm text-primary hover:bg-muted/50 hover:underline transition-colors"
                  >
                    {report.firstName} {report.lastName}
                    {report.employeeCode && (
                      <span className="ml-2 text-muted-foreground/70">({report.employeeCode})</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Actions</h3>
            <div className="space-y-2">
              {can('employee.update') && (
                <button
                  onClick={() => router.push(`/employees/${id}/edit`)}
                  className="w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium"
                >
                  Edit Employee
                </button>
              )}

              {(can('employee.read') || emp.userId === user?.user?.id) && (
                <button
                  onClick={handleDownloadIdCard}
                  disabled={downloadingCard}
                  className="w-full rounded-md border border-border bg-card text-foreground hover:bg-muted motion-press transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {downloadingCard ? 'Preparing…' : 'Download ID Card'}
                </button>
              )}

              {can('user.create') && !emp.userId && emp.isActive && (
                <button
                  onClick={openInvite}
                  className="w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium"
                >
                  Invite to log in
                </button>
              )}

              {can('user.manage_roles') && emp.userId && (
                <button
                  onClick={() => {
                    setPwValue('');
                    setPwOpen(true);
                  }}
                  className="w-full rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 motion-press transition-colors px-4 py-2 text-sm font-medium"
                >
                  Set password
                </button>
              )}

              {can('employee.delete') && emp.isActive && (
                <button
                  onClick={handleDeactivate}
                  disabled={acting}
                  className="w-full rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 motion-press transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {acting ? 'Deactivating...' : 'Deactivate'}
                </button>
              )}

              {can('employee.update') && !emp.isActive && (
                <button
                  onClick={handleReactivate}
                  disabled={acting}
                  className="w-full rounded-md bg-success text-success-foreground hover:bg-success/90 motion-press transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {acting ? 'Reactivating...' : 'Reactivate'}
                </button>
              )}
            </div>
            {actionError && (
              <div className="mt-3">
                <ErrorMessage message={actionError} />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">Created</h3>
            <p className="text-sm text-muted-foreground">{formatDate(emp.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Set-password modal */}
      {pwOpen && emp.userId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-card p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Set password</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {emp.firstName} {emp.lastName}
            </p>
            <div className="mt-4">
              <label className="block text-xs font-medium text-foreground/80">
                New password (min 8 characters)
              </label>
              <input
                type="text"
                value={pwValue}
                onChange={(e) => setPwValue(e.target.value)}
                placeholder="Enter a temporary password"
                autoFocus
                className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Saves immediately and signs the user out of every device. Share the password
                securely.
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setPwOpen(false);
                  setPwValue('');
                }}
                disabled={pwBusy}
                className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitSetPassword}
                disabled={pwBusy || pwValue.length < 8}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {pwBusy ? 'Saving…' : 'Set password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite-to-login modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-card p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Invite to log in</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Send {emp.firstName} {emp.lastName} a login invitation. They'll receive an email with a
              link to set their password. Their User account will be auto-linked to this employee
              profile on accept.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground/80">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="employee@example.com"
                  className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/80">Role</label>
                <select
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="">Select a role…</option>
                  {(invitableRoles ?? [])
                    .filter((r) => r.isActive)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setInviteOpen(false)}
                disabled={inviteBusy}
                className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitInvite}
                disabled={inviteBusy || !inviteEmail || !inviteRoleId}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {inviteBusy ? 'Sending…' : 'Send invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
