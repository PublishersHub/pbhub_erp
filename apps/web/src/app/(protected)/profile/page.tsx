'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { useToast } from '@/components/toast';
import { useAuth } from '@/context/auth-context';
import {
  getMyAccount,
  updateMyAccount,
  changeMyPassword,
  type AccountProfile,
} from '@/lib/account-api';

const inputCls =
  'mt-1 block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';
const labelCls = 'block text-sm font-medium text-foreground/80';

export default function ProfilePage() {
  const toast = useToast();
  const { logout, refreshUser } = useAuth();

  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Profile form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    getMyAccount()
      .then((data) => {
        setProfile(data);
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setEmail(data.email);
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoadingProfile(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      const updated = await updateMyAccount({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });
      setProfile(updated);
      await refreshUser();
      toast.success('Profile updated', 'Your name and email have been saved.');
    } catch (err) {
      toast.error('Update failed', err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSavingProfile(false);
    }
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
        {/* Profile card */}
        <div className="surface-elevated rounded-2xl border border-hairline shadow-soft p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Profile</h3>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className={labelCls}>
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  minLength={1}
                  className={inputCls}
                  disabled={savingProfile}
                />
              </div>
              <div>
                <label htmlFor="lastName" className={labelCls}>
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  minLength={1}
                  className={inputCls}
                  disabled={savingProfile}
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className={labelCls}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputCls}
                disabled={savingProfile}
              />
            </div>
            {profile && (
              <p className="text-[11px] text-muted-foreground">
                Account ID: {profile.id}
                {profile.lastLoginAt && (
                  <> &middot; Last login: {new Date(profile.lastLoginAt).toLocaleString()}</>
                )}
              </p>
            )}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 motion-press disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingProfile ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
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
              <button
                type="submit"
                disabled={savingPassword}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 motion-press disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingPassword ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
