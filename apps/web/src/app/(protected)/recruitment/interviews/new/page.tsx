'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { Loading } from '@/components/ui/loading';
import { scheduleInterview } from '@/lib/recruitment-api';
import { get } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import type { InterviewType, InterviewMode, EmployeeRef } from '@/types/recruitment';

const INTERVIEW_TYPES: InterviewType[] = [
  'PHONE_SCREEN', 'TECHNICAL', 'BEHAVIORAL', 'PANEL',
  'SYSTEM_DESIGN', 'HIRING_MANAGER', 'HR_ROUND', 'FINAL', 'OTHER',
];

const INTERVIEW_MODES: InterviewMode[] = ['VIDEO', 'IN_PERSON', 'PHONE'];

export default function ScheduleInterviewPage() {
  useEffect(() => {
    document.title = 'Schedule Interview · PbHub';
  }, []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetAppId = searchParams.get('applicationId') || '';

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: employees, loading: empLoading } = useAsync(() => get<EmployeeRef[]>('/api/employees'), []);

  const [applicationId, setApplicationId] = useState(presetAppId);
  const [type, setType] = useState<InterviewType>('TECHNICAL');
  const [mode, setMode] = useState<InterviewMode>('VIDEO');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPanelists, setSelectedPanelists] = useState<string[]>([]);
  const [primaryPanelistId, setPrimaryPanelistId] = useState('');

  function togglePanelist(empId: string) {
    setSelectedPanelists((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId],
    );
    if (primaryPanelistId === empId) setPrimaryPanelistId('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (selectedPanelists.length === 0) {
      setError('Select at least one panelist');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const result = await scheduleInterview({
        applicationId,
        type,
        mode,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes,
        panelistEmployeeIds: selectedPanelists,
        ...(primaryPanelistId && { primaryPanelistEmployeeId: primaryPanelistId }),
        ...(location.trim() && { location: location.trim() }),
        ...(meetingUrl.trim() && { meetingUrl: meetingUrl.trim() }),
        ...(notes.trim() && { notes: notes.trim() }),
      });
      router.push(`/recruitment/interviews/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule interview');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = 'mt-1 block w-full rounded-md border border-input bg-card text-foreground focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';
  const labelCls = 'block text-sm font-medium text-foreground';

  if (empLoading) {
    return (
      <div>
        <PageHeader title="Schedule Interview" backHref="/recruitment/applications" />
        <Loading />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Schedule Interview" backHref={presetAppId ? `/recruitment/applications/${presetAppId}` : '/recruitment/applications'} />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 rounded-lg border border-border bg-card p-6 shadow-soft">
        <div>
          <label className={labelCls}>Application ID *</label>
          <input required value={applicationId} onChange={(e) => setApplicationId(e.target.value)} className={inputCls} readOnly={!!presetAppId} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Interview Type *</label>
            <select required value={type} onChange={(e) => setType(e.target.value as InterviewType)} className={inputCls}>
              {INTERVIEW_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Mode *</label>
            <select required value={mode} onChange={(e) => setMode(e.target.value as InterviewMode)} className={inputCls}>
              {INTERVIEW_MODES.map((m) => (
                <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Scheduled Date & Time *</label>
            <input required type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Duration (minutes)</label>
            <input type="number" min={15} value={durationMinutes} onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="e.g. Room 3B" />
          </div>
          <div>
            <label className={labelCls}>Meeting URL</label>
            <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} className={inputCls} placeholder="e.g. https://meet.google.com/..." />
          </div>
        </div>

        <div>
          <label className={labelCls}>Panelists * <span className="font-normal text-gray-400">(select at least 1)</span></label>
          {employees && employees.length > 0 ? (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-border p-2 space-y-1">
              {employees.map((emp) => {
                const isSelected = selectedPanelists.includes(emp.id);
                return (
                  <label key={emp.id} className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePanelist(emp.id)}
                      className="rounded border-input"
                    />
                    <span>{emp.firstName} {emp.lastName}</span>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setPrimaryPanelistId(primaryPanelistId === emp.id ? '' : emp.id); }}
                        className={`ml-auto text-xs px-2 py-0.5 rounded motion-press ${primaryPanelistId === emp.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                      >
                        {primaryPanelistId === emp.id ? 'Primary' : 'Set primary'}
                      </button>
                    )}
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground/70">No employees found</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 motion-press disabled:opacity-50"
          >
            {submitting ? 'Scheduling...' : 'Schedule Interview'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 motion-press"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
