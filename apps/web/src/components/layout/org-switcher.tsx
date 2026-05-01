'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';

export function OrgSwitcher() {
  const { user, switchOrganization } = useAuth();
  const [open, setOpen] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  if (!user || user.memberships.length <= 1) return null;

  const active = user.memberships.find((m) => m.organizationId === user.activeOrganizationId);

  async function handlePick(orgId: string) {
    if (orgId === user!.activeOrganizationId) {
      setOpen(false);
      return;
    }
    setSubmittingId(orgId);
    try {
      await switchOrganization(orgId);
      setOpen(false);
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors duration-150 motion-press"
      >
        <span>{active?.organizationName ?? 'Select organization'}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-4 w-4 text-muted-foreground"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-64 rounded-md border border-border bg-popover py-1 shadow-elevated text-popover-foreground">
          {user.memberships.map((m) => {
            const isActive = m.organizationId === user.activeOrganizationId;
            return (
              <button
                key={m.organizationId}
                type="button"
                disabled={submittingId !== null}
                onClick={() => handlePick(m.organizationId)}
                className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-secondary disabled:opacity-50 transition-colors duration-150 motion-press ${
                  isActive ? 'bg-accent' : ''
                }`}
              >
                <span className={`font-medium ${isActive ? 'text-accent-foreground' : 'text-foreground'}`}>
                  {m.organizationName}
                </span>
                <span className="text-xs text-muted-foreground">/{m.organizationSlug}</span>
                {submittingId === m.organizationId && (
                  <span className="text-xs text-primary">Switching…</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
