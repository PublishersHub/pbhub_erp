'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { Loading } from '@/components/ui/loading';
import { LoadingButton } from '@/components/ui/loading-button';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useAsync } from '@/lib/hooks';
import { listEmployees, listDepartments } from '@/lib/employee-api';
import {
  sendAdminMail,
  type AdminMailRecipientType,
  type SendAdminMailPayload,
} from '@/lib/admin-mail-api';

export default function ComposeMailPage() {
  useDocumentTitle('Compose Email');
  const toast = useToast();
  const confirm = useConfirm();

  // Form state
  const [recipientType, setRecipientType] =
    useState<AdminMailRecipientType>('all');
  const [departmentId, setDepartmentId] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(
    new Set(),
  );
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Data
  const { data: employees, loading: empLoading } = useAsync(
    () => listEmployees({ isActive: 'true' }),
    [],
  );
  const { data: departments, loading: deptLoading } = useAsync(
    () => listDepartments(),
    [],
  );

  const sortedEmployees = useMemo(
    () =>
      [...(employees ?? [])].sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
      ),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return sortedEmployees;
    return sortedEmployees.filter((e) => {
      const hay = `${e.firstName} ${e.lastName} ${e.employeeCode ?? ''} ${
        e.department?.name ?? ''
      }`.toLowerCase();
      return hay.includes(q);
    });
  }, [sortedEmployees, employeeSearch]);

  // Recipient count preview
  const recipientCount = useMemo(() => {
    if (recipientType === 'all') return sortedEmployees.length;
    if (recipientType === 'department') {
      if (!departmentId) return 0;
      return sortedEmployees.filter((e) => e.departmentId === departmentId).length;
    }
    return selectedEmployeeIds.size;
  }, [recipientType, departmentId, selectedEmployeeIds, sortedEmployees]);

  const canSend =
    !submitting &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    recipientCount > 0 &&
    (recipientType !== 'department' || !!departmentId) &&
    (recipientType !== 'specific' || selectedEmployeeIds.size > 0);

  function toggleEmployee(id: string) {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      filteredEmployees.forEach((e) => next.add(e.id));
      return next;
    });
  }

  function clearSelection() {
    setSelectedEmployeeIds(new Set());
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    setError('');

    const ok = await confirm({
      title: 'Send this email?',
      description: `It will be delivered to ${recipientCount} recipient${
        recipientCount === 1 ? '' : 's'
      }. This cannot be undone.`,
      confirmLabel: 'Send',
      cancelLabel: 'Cancel',
    });
    if (!ok) return;

    const payload: SendAdminMailPayload = {
      recipientType,
      subject: subject.trim(),
      body,
    };
    if (recipientType === 'department') payload.departmentId = departmentId;
    if (recipientType === 'specific') {
      payload.employeeIds = Array.from(selectedEmployeeIds);
    }

    setSubmitting(true);
    try {
      const res = await sendAdminMail(payload);
      if (res.failed > 0) {
        toast.warning(
          'Email sent with errors',
          `Delivered ${res.sent}/${res.total}. ${res.failed} failed.`,
        );
      } else {
        toast.success(
          'Email sent',
          `Delivered to ${res.sent} recipient${res.sent === 1 ? '' : 's'}.`,
        );
      }
      // Reset form
      setSubject('');
      setBody('');
      setSelectedEmployeeIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    'mt-1 block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';
  const labelCls = 'block text-sm font-medium text-foreground/80';

  if (empLoading || deptLoading) {
    return (
      <div>
        <PageHeader title="Compose Email" />
        <Loading />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Compose Email"
        description="Send a message to employees from inside the HRMS."
      />

      <form
        onSubmit={handleSubmit}
        className="max-w-3xl space-y-6 rounded-lg border border-border bg-card p-6 shadow-soft"
      >
        {/* ─── Recipients ──────────── */}
        <fieldset className="space-y-3">
          <legend className={labelCls}>Recipients</legend>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="recipientType"
                value="all"
                checked={recipientType === 'all'}
                onChange={() => setRecipientType('all')}
              />
              <span>All employees</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="recipientType"
                value="department"
                checked={recipientType === 'department'}
                onChange={() => setRecipientType('department')}
              />
              <span>By department</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="recipientType"
                value="specific"
                checked={recipientType === 'specific'}
                onChange={() => setRecipientType('specific')}
              />
              <span>Specific employees</span>
            </label>
          </div>

          {recipientType === 'department' && (
            <div>
              <label className={labelCls}>Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className={inputCls}
              >
                <option value="">Select a department…</option>
                {(departments ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {recipientType === 'specific' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="search"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Search employees by name, code, or department…"
                  className={inputCls + ' mt-0 flex-1'}
                />
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="rounded-md border border-input bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted motion-press"
                >
                  Select visible
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded-md border border-input bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted motion-press"
                >
                  Clear
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto rounded-md border border-border bg-background">
                {filteredEmployees.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    No employees match your search.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {filteredEmployees.map((emp) => {
                      const checked = selectedEmployeeIds.has(emp.id);
                      return (
                        <li key={emp.id}>
                          <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleEmployee(emp.id)}
                            />
                            <span className="flex-1">
                              {emp.firstName} {emp.lastName}
                              {emp.employeeCode ? (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {emp.employeeCode}
                                </span>
                              ) : null}
                            </span>
                            {emp.department?.name && (
                              <span className="text-xs text-muted-foreground">
                                {emp.department.name}
                              </span>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedEmployeeIds.size} selected
              </p>
            </div>
          )}
        </fieldset>

        {/* ─── Subject ─────────────── */}
        <div>
          <label className={labelCls}>Subject *</label>
          <input
            type="text"
            required
            maxLength={200}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputCls}
            placeholder="e.g. Office closed on Friday"
          />
        </div>

        {/* ─── Body ────────────────── */}
        <div>
          <label className={labelCls}>Message *</label>
          <textarea
            required
            rows={10}
            maxLength={20000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={inputCls + ' font-mono'}
            placeholder="Write your message…"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Plain text. The email will be wrapped in your organization&apos;s
            branded HTML template.
          </p>
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="flex items-center gap-3">
          <LoadingButton
            type="submit"
            loading={submitting}
            loadingText="Sending…"
            disabled={!canSend}
          >
            Send to {recipientCount} recipient{recipientCount === 1 ? '' : 's'}
          </LoadingButton>
          <p className="text-xs text-muted-foreground">
            Recipients without a linked account email will be skipped.
          </p>
        </div>
      </form>
    </div>
  );
}
