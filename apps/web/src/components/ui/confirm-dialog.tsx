'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ConfirmTone = 'danger' | 'warning' | 'default';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingState extends ConfirmOptions {
  resolve: (v: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const close = (result: boolean) => {
    if (!pending) return;
    pending.resolve(result);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm motion-fade-in"
          onClick={() => close(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-hairline bg-card p-6 shadow-2xl motion-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                pending.tone === 'danger' ? 'bg-destructive/10 text-destructive'
                : pending.tone === 'warning' ? 'bg-warning/10 text-warning'
                : 'bg-primary/10 text-primary'
              }`}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground">{pending.title}</h3>
                {pending.description && (
                  <p className="mt-1.5 text-sm text-muted-foreground">{pending.description}</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => close(false)}
                className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted motion-press"
              >
                {pending.cancelLabel ?? 'Cancel'}
              </button>
              <button
                onClick={() => close(true)}
                autoFocus
                className={`rounded-lg px-4 py-2 text-sm font-semibold motion-press ${
                  pending.tone === 'danger'
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : pending.tone === 'warning'
                    ? 'bg-warning text-warning-foreground hover:bg-warning/90'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {pending.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
