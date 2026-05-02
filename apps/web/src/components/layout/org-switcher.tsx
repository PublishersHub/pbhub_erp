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
        className="flex items-center gap-2.5 rounded-xl border border-hairline bg-card/40 px-3 py-1.5 text-sm font-medium text-foreground backdrop-blur transition-all hover:border-border hover:bg-secondary motion-press"
      >
        <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
        <span className="max-w-[12rem] truncate">{active?.organizationName ?? 'Select organization'}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.6}
          stroke="currentColor"
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="surface-glass absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-2xl border-hairline p-1 text-popover-foreground shadow-floating motion-scale-in">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Switch organization
          </div>
          {user.memberships.map((m) => {
            const isActive = m.organizationId === user.activeOrganizationId;
            return (
              <button
                key={m.organizationId}
                type="button"
                disabled={submittingId !== null}
                onClick={() => handlePick(m.organizationId)}
                className={`group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-all duration-150 disabled:opacity-50 motion-press ${
                  isActive ? 'bg-primary/10' : 'hover:bg-secondary/60'
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    isActive ? 'gradient-brand text-white shadow-sm' : 'bg-secondary text-muted-foreground group-hover:text-foreground'
                  }`}
                >
                  {m.organizationName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-medium ${isActive ? 'text-foreground' : 'text-foreground'}`}>
                    {m.organizationName}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    /{m.organizationSlug} · {m.roles[0] ?? 'member'}
                  </div>
                </div>
                {isActive && !submittingId && (
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.4} stroke="currentColor" className="h-4 w-4 text-primary">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
                {submittingId === m.organizationId && (
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin text-primary">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
