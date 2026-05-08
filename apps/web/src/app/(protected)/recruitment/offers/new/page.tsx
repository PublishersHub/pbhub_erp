'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { Loading } from '@/components/ui/loading';
import { FileField } from '@/components/files/file-field';
import { createOffer } from '@/lib/recruitment-api';
import { get } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import type { EmploymentType, DepartmentRef, DesignationRef, EmployeeRef } from '@/types/recruitment';

const EMPLOYMENT_TYPES: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];

export default function CreateOfferPage() {
  useDocumentTitle('New Offer');
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetAppId = searchParams.get('applicationId') || '';

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: employees, loading: empLoading } = useAsync(() => get<EmployeeRef[]>('/api/employees'), []);
  const { data: departments, loading: deptLoading } = useAsync(() => get<DepartmentRef[]>('/api/departments'), []);
  const { data: designations, loading: desigLoading } = useAsync(() => get<DesignationRef[]>('/api/designations'), []);

  const refsLoading = empLoading || deptLoading || desigLoading;

  const [applicationId, setApplicationId] = useState(presetAppId);
  const [employmentType, setEmploymentType] = useState<EmploymentType>('FULL_TIME');
  const [baseSalary, setBaseSalary] = useState('');
  const [joiningBonus, setJoiningBonus] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [proposedJoiningDate, setProposedJoiningDate] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [reportingManagerId, setReportingManagerId] = useState('');
  const [offerLetterUrl, setOfferLetterUrl] = useState('');
  const [offerLetterFileName, setOfferLetterFileName] = useState('');
  const [notes, setNotes] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (offerLetterUrl.trim() && !offerLetterFileName.trim()) {
      setError('Please provide a file name for the offer letter.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const result = await createOffer({
        applicationId,
        employmentType,
        baseSalary: parseFloat(baseSalary),
        proposedJoiningDate,
        expiresAt: new Date(expiresAt).toISOString(),
        ...(currency !== 'PKR' && { currency }),
        ...(joiningBonus && { joiningBonus: parseFloat(joiningBonus) }),
        ...(departmentId && { departmentId }),
        ...(designationId && { designationId }),
        ...(reportingManagerId && { reportingManagerId }),
        ...(offerLetterUrl.trim() && { offerLetterUrl: offerLetterUrl.trim() }),
        ...(offerLetterUrl.trim() && offerLetterFileName.trim() && { offerLetterFileName: offerLetterFileName.trim() }),
        ...(notes.trim() && { notes: notes.trim() }),
      });
      router.push(`/recruitment/offers/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create offer');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = 'mt-1 block w-full rounded-md border border-input bg-card text-foreground focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';
  const labelCls = 'block text-sm font-medium text-foreground';

  if (refsLoading) {
    return (
      <div>
        <PageHeader title="Create Offer" backHref="/recruitment/applications" />
        <Loading />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Create Offer" backHref={presetAppId ? `/recruitment/applications/${presetAppId}` : '/recruitment/applications'} />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 rounded-lg border border-border bg-card p-6 shadow-soft">
        <div>
          <label className={labelCls}>Application ID *</label>
          <input required value={applicationId} onChange={(e) => setApplicationId(e.target.value)} className={inputCls} readOnly={!!presetAppId} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Employment Type *</label>
            <select required value={employmentType} onChange={(e) => setEmploymentType(e.target.value as EmploymentType)} className={inputCls}>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Base Salary *</label>
            <input required type="number" min={0} step="0.01" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Joining Bonus</label>
            <input type="number" min={0} step="0.01" value={joiningBonus} onChange={(e) => setJoiningBonus(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Proposed Joining Date *</label>
            <input required type="date" value={proposedJoiningDate} onChange={(e) => setProposedJoiningDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Offer Expires *</label>
            <input required type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Department</label>
            {departments && departments.length > 0 ? (
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputCls}>
                <option value="">None</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            ) : (
              <input value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputCls} placeholder="No departments" />
            )}
          </div>
          <div>
            <label className={labelCls}>Designation</label>
            {designations && designations.length > 0 ? (
              <select value={designationId} onChange={(e) => setDesignationId(e.target.value)} className={inputCls}>
                <option value="">None</option>
                {designations.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            ) : (
              <input value={designationId} onChange={(e) => setDesignationId(e.target.value)} className={inputCls} placeholder="No designations" />
            )}
          </div>
        </div>

        <div>
          <label className={labelCls}>Reporting Manager</label>
          {employees && employees.length > 0 ? (
            <select value={reportingManagerId} onChange={(e) => setReportingManagerId(e.target.value)} className={inputCls}>
              <option value="">None</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
              ))}
            </select>
          ) : (
            <input value={reportingManagerId} onChange={(e) => setReportingManagerId(e.target.value)} className={inputCls} placeholder="No employees" />
          )}
        </div>

        <FileField
          label="Offer Letter"
          fileUrl={offerLetterUrl}
          fileName={offerLetterFileName}
          onUrlChange={setOfferLetterUrl}
          onNameChange={setOfferLetterFileName}
          helperText="Attach the offer letter document"
        />

        <div>
          <label className={labelCls}>Notes</label>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 motion-press disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create Offer'}
          </button>
          <button type="button" onClick={() => router.back()} className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 motion-press">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
