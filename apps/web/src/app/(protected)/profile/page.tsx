'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { InlineEdit } from '@/components/ui/inline-edit';
import { LoadingButton } from '@/components/ui/loading-button';
import { EmployeeAvatar } from '@/components/ui/employee-avatar';
import { AvatarUploader } from '@/components/ui/avatar-uploader';
import { useToast } from '@/components/toast';
import { useAuth } from '@/context/auth-context';
import {
  getMyAccount,
  updateMyAccount,
  changeMyPassword,
  type AccountProfile,
} from '@/lib/account-api';
import { getMyEmployee, updateMyEmployee } from '@/lib/employee-api';
import type { Employee } from '@/types/employee';

const inputCls =
  'mt-1 block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';
const labelCls = 'block text-sm font-medium text-foreground/80';

// Checklist of "ideal" profile fields. We only count fields that exist on the
// AccountProfile model today; the rest stay as guidance for users.
const COMPLETENESS_FIELDS: { key: keyof AccountProfile; label: string }[] = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email address' },
];

function computeCompleteness(profile: AccountProfile | null) {
  if (!profile) return { percent: 0, missing: [] as string[] };
  const missing: string[] = [];
  let filled = 0;
  for (const f of COMPLETENESS_FIELDS) {
    const v = profile[f.key];
    if (typeof v === 'string' && v.trim().length > 0) filled++;
    else missing.push(f.label);
  }
  const percent = Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
  return { percent, missing };
}

export default function ProfilePage() {
  const toast = useToast();
  const { logout, refreshUser } = useAuth();

  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Employee row in the active org. May be null for accounts with no employee
  // profile (e.g. an org admin who isn't an employee). The avatar still renders
  // initials in that case; the upload affordance is hidden.
  const [employee, setEmployee] = useState<Employee | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    document.title = 'My Profile · PbHub';
  }, []);

  const loadProfile = async () => {
    try {
      const [account, emp] = await Promise.all([
        getMyAccount(),
        // /api/employees/me may 403 for accounts without `employee.read_own`
        // (rare, but possible for super-admin without an employee row). Fall
        // back to null so the page still renders.
        getMyEmployee().catch(() => null),
      ]);
      setProfile(account);
      setEmployee(emp);
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePhotoUploaded(key: string) {
    try {
      const updated = await updateMyEmployee({ profileImageUrl: key });
      setEmployee(updated);
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(
        'Failed to update photo',
        err instanceof Error ? err.message : 'Please try again',
      );
    }
  }

  // InlineEdit save wrapper — patches a single field, refreshes auth-context.
  async function saveField(field: 'firstName' | 'lastName' | 'email', next: string) {
    const trimmed = next.trim();
    if (!trimmed) {
      throw new Error(`${field === 'email' ? 'Email' : 'Name'} cannot be empty`);
    }
    const updated = await updateMyAccount({ [field]: trimmed });
    setProfile(updated);
    await refreshUser();
    toast.success('Profile updated');
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (savingPassword) return;

    if (newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match', 'New password and confirmation must be identical.');
      return;
    }

    setSavingPassword(true);
    try {
      await changeMyPassword({ currentPassword, newPassword });
      toast.success('Password updated', 'Signing you out…');
      setTimeout(() => logout(), 800);
    } catch (err) {
      toast.error('Password change failed', err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSavingPassword(false);
    }
  }

  const { percent, missing } = useMemo(() => computeCompleteness(profile), [profile]);

  if (loadingProfile) {
    return (
      <div>
        <PageHeader title="My Profile" description="Manage your account details." />
        <Loading />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Profile" description="Manage your account details and password." />

      <div className="grid gap-6 max-w-2xl">
        {/* Avatar + identity header */}
        <div className="flex items-center gap-5 rounded-2xl border border-hairline bg-card p-5 shadow-soft">
          {employee ? (
            <AvatarUploader
              firstName={profile?.firstName}
              lastName={profile?.lastName}
              imageUrl={employee.profileImageUrl}
              seed={employee.id}
              employeeId={employee.id}
              onUploaded={handlePhotoUploaded}
              onError={(msg) => toast.error('Upload failed', msg)}
            />
          ) : (
            <EmployeeAvatar
              size={96}
              firstName={profile?.firstName}
              lastName={profile?.lastName}
              seed={profile?.id ?? 'me'}
              imageUrl={null}
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-foreground">
              {`${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() || 'Your account'}
            </p>
            <p className="truncate text-sm text-muted-foreground">{profile?.email}</p>
            {!employee && (
              <p className="mt-1 text-xs text-muted-foreground/70">
                No employee profile in this organization — photo cannot be set here.
              </p>
            )}
          </div>
        </div>

        {/* Completeness meter */}
        <div className="rounded-2xl border border-hairline bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Profile completeness</p>
            <span className="text-sm font-semibold text-primary">{percent}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
          </div>
          {missing.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Missing: {missing.slice(0, 3).join(', ')}
              {missing.length > 3 ? ` +${missing.length - 3} more` : ''}
            </p>
          )}
        </div>

        {/* Profile card */}
        <div className="surface-elevated rounded-2xl border border-hairline shadow-soft p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Profile</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>First name</label>
                <div className="mt-1">
                  <InlineEdit
                    value={profile?.firstName ?? ''}
                    placeholder="e.g. Jane"
                    emptyText="Add first name"
                    onSave={(next) => saveField('firstName', next)}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Last name</label>
                <div className="mt-1">
                  <InlineEdit
                    value={profile?.lastName ?? ''}
                    placeholder="e.g. Doe"
                    emptyText="Add last name"
                    onSave={(next) => saveField('lastName', next)}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className={labelCls}>Email address</label>
              <div className="mt-1">
                <InlineEdit
                  value={profile?.email ?? ''}
                  type="email"
                  placeholder="you@company.com"
                  emptyText="Add email"
                  onSave={(next) => saveField('email', next)}
                />
              </div>
            </div>

            {profile && (
              <p className="text-[11px] text-muted-foreground pt-1">
                Account ID: {profile.id}
                {profile.lastLoginAt && (
                  <> &middot; Last login: {new Date(profile.lastLoginAt).toLocaleString()}</>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Change password card */}
        <div className="surface-elevated rounded-2xl border border-hairline shadow-soft p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">Change password</h3>
          <p className="text-xs text-muted-foreground mb-4">
            After changing your password, all other active sessions will be signed out.
          </p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className={labelCls}>
                Current password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                minLength={1}
                autoComplete="current-password"
                className={inputCls}
                disabled={savingPassword}
              />
            </div>
            <div>
              <label htmlFor="newPassword" className={labelCls}>
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={inputCls}
                disabled={savingPassword}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Minimum 8 characters.</p>
            </div>
            <div>
              <label htmlFor="confirmNewPassword" className={labelCls}>
                Confirm new password
              </label>
              <input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={inputCls}
                disabled={savingPassword}
              />
            </div>
            <div className="flex justify-end pt-1">
              <LoadingButton
                type="submit"
                loading={savingPassword}
                loadingText="Updating…"
              >
                Update password
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
