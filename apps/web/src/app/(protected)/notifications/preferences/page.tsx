'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingButton } from '@/components/ui/loading-button';
import { useToast } from '@/components/toast';
import { useAsync } from '@/lib/hooks';
import { listPreferences, updatePreferences } from '@/lib/notification-api';

// Group event types by module for display
const EVENT_MODULES: { module: string; events: { type: string; label: string }[] }[] = [
  {
    module: 'Leave',
    events: [
      { type: 'leave.submitted', label: 'Leave submitted' },
      { type: 'leave.approved', label: 'Leave approved' },
      { type: 'leave.rejected', label: 'Leave rejected' },
      { type: 'leave.cancelled', label: 'Leave cancelled' },
    ],
  },
  {
    module: 'Expense',
    events: [
      { type: 'expense.submitted', label: 'Expense submitted' },
      { type: 'expense.manager_approved', label: 'Expense manager approved' },
      { type: 'expense.finance_approved', label: 'Expense finance approved' },
      { type: 'expense.rejected', label: 'Expense rejected' },
      { type: 'expense.reimbursed', label: 'Expense reimbursed' },
      { type: 'expense.cancelled', label: 'Expense cancelled' },
    ],
  },
  {
    module: 'Payroll',
    events: [
      { type: 'payroll.cycle_finalized', label: 'Payslip available' },
    ],
  },
  {
    module: 'Performance',
    events: [
      { type: 'performance.cycle_status_changed', label: 'Cycle status changed' },
      { type: 'performance.goal_approved', label: 'Goal approved' },
      { type: 'performance.goal_rejected', label: 'Goal rejected' },
      { type: 'performance.review_completed', label: 'Review completed' },
    ],
  },
  {
    module: 'Attendance',
    events: [
      { type: 'attendance.correction_submitted', label: 'Correction submitted' },
      { type: 'attendance.correction_decided', label: 'Correction decided' },
    ],
  },
  {
    module: 'Recruitment',
    events: [
      { type: 'recruitment.requisition_submitted', label: 'Requisition submitted' },
      { type: 'recruitment.requisition_approved', label: 'Requisition approved' },
      { type: 'recruitment.requisition_rejected', label: 'Requisition rejected' },
      { type: 'recruitment.posting_published', label: 'Posting published' },
      { type: 'recruitment.application_received', label: 'Application received' },
      { type: 'recruitment.application_stage_changed', label: 'Application stage changed' },
      { type: 'recruitment.application_rejected', label: 'Application rejected' },
      { type: 'recruitment.application_withdrawn', label: 'Application withdrawn' },
      { type: 'recruitment.interview_scheduled', label: 'Interview scheduled' },
      { type: 'recruitment.interview_cancelled', label: 'Interview cancelled' },
      { type: 'recruitment.interview_feedback_submitted', label: 'Interview feedback submitted' },
      { type: 'recruitment.offer_extended', label: 'Offer extended' },
      { type: 'recruitment.offer_responded', label: 'Offer responded' },
      { type: 'recruitment.candidate_hired', label: 'Candidate hired' },
    ],
  },
  {
    module: 'Onboarding',
    events: [
      { type: 'onboarding.started', label: 'Onboarding started' },
      { type: 'onboarding.task_assigned', label: 'Task assigned' },
      { type: 'onboarding.task_completed', label: 'Task completed' },
      { type: 'onboarding.completed', label: 'Onboarding completed' },
    ],
  },
];

export default function NotificationPreferencesPage() {
  const toast = useToast();
  const { data: prefs, error, loading, refetch } = useAsync(() => listPreferences());
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<
    Map<string, boolean>
  >(new Map());

  useDocumentTitle('Notification Preferences');

  // Build a lookup: "eventType:channel" -> enabled
  const prefMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (prefs) {
      for (const p of prefs) {
        map.set(`${p.eventType}:${p.channel}`, p.enabled);
      }
    }
    return map;
  }, [prefs]);

  const isEnabled = useCallback(
    (eventType: string): boolean => {
      const key = `${eventType}:IN_APP`;
      if (pendingChanges.has(key)) return pendingChanges.get(key)!;
      const saved = prefMap.get(key);
      // Default to enabled if no explicit preference
      return saved ?? true;
    },
    [prefMap, pendingChanges],
  );

  const handleToggle = useCallback((eventType: string, currentVal: boolean) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(`${eventType}:IN_APP`, !currentVal);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (pendingChanges.size === 0) return;
    setSaving(true);
    try {
      const items = Array.from(pendingChanges.entries()).map(([key, enabled]) => {
        const [eventType] = key.split(':');
        return { eventType, channel: 'IN_APP' as const, enabled };
      });
      await updatePreferences({ preferences: items });
      setPendingChanges(new Map());
      refetch();
      toast.success('Preferences saved', 'Your notification settings are up to date.');
    } catch (err) {
      toast.error(
        'Save failed',
        err instanceof Error ? err.message : 'Could not update preferences',
      );
    } finally {
      setSaving(false);
    }
  }, [pendingChanges, refetch, toast]);

  const handleDiscard = useCallback(() => {
    setPendingChanges(new Map());
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const hasChanges = pendingChanges.size > 0;

  return (
    <div>
      <PageHeader
        title="Notification Preferences"
        description="Choose which notifications you want to receive."
        backHref="/notifications"
        actions={
          hasChanges ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDiscard}
                className="rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground hover:bg-muted motion-press"
              >
                Discard
              </button>
              <LoadingButton
                onClick={handleSave}
                loading={saving}
                loadingText="Saving…"
              >
                Save changes
              </LoadingButton>
            </div>
          ) : undefined
        }
      />

      {EVENT_MODULES.length === 0 ? (
        <EmptyState title="No preferences" description="No notification events are configured." />
      ) : (
        <div className="space-y-6">
          {EVENT_MODULES.map((mod) => (
            <div
              key={mod.module}
              className="overflow-hidden rounded-lg border border-border bg-card shadow-soft"
            >
              <div className="border-b border-border bg-muted/60 px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">{mod.module}</h3>
              </div>
              <div className="divide-y divide-border">
                {mod.events.map((evt) => {
                  const enabled = isEnabled(evt.type);
                  return (
                    <div
                      key={evt.type}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div>
                        <p className="text-sm text-foreground/80">{evt.label}</p>
                        <p className="text-xs text-muted-foreground/70">{evt.type}</p>
                      </div>
                      <button
                        onClick={() => handleToggle(evt.type, enabled)}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                          enabled ? 'bg-primary' : 'bg-muted'
                        }`}
                        role="switch"
                        aria-checked={enabled}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-card transition-transform ${
                            enabled ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
