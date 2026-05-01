'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function SelectOrganizationPage() {
  const router = useRouter();
  const { user, pendingMemberships, selectOrganization } = useAuth();
  const memberships = pendingMemberships ?? user?.memberships ?? [];
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (memberships.length === 0) {
      router.push('/login');
    }
  }, [memberships.length, router]);

  if (memberships.length === 0) {
    return null;
  }

  async function handlePick(orgId: string) {
    setSubmittingId(orgId);
    setError(null);
    try {
      await selectOrganization(orgId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enter organization');
      setSubmittingId(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Choose an organization</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick the organization you want to work in. You can switch later from the top nav.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 motion-fade-in">
          {memberships.map((m) => (
            <button
              key={m.organizationId}
              type="button"
              disabled={submittingId !== null}
              onClick={() => handlePick(m.organizationId)}
              className="flex flex-col items-start gap-2 rounded-lg border border-border bg-card p-5 text-left shadow-soft transition-colors duration-150 hover:border-primary hover:bg-accent disabled:opacity-50 motion-lift"
            >
              <span className="text-base font-semibold text-foreground">{m.organizationName}</span>
              <span className="text-xs text-muted-foreground">/{m.organizationSlug}</span>
              <div className="flex flex-wrap gap-1">
                {m.roles.map((r) => (
                  <span
                    key={r}
                    className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                  >
                    {r}
                  </span>
                ))}
              </div>
              {submittingId === m.organizationId && (
                <span className="text-xs text-primary">Entering…</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
