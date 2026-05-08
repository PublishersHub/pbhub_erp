'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { Loading } from '@/components/ui/loading';
import { FileField } from '@/components/files/file-field';
import { createCandidate } from '@/lib/recruitment-api';
import { get } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import type { CandidateSource, EmployeeRef } from '@/types/recruitment';

const SOURCES: CandidateSource[] = [
  'CAREERS_PAGE', 'LINKEDIN', 'INDEED', 'REFERRAL', 'AGENCY', 'DIRECT_OUTREACH', 'WALK_IN', 'OTHER',
];

export default function CreateCandidatePage() {
  useDocumentTitle('New Candidate');
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: employees, loading: empLoading } = useAsync(() => get<EmployeeRef[]>('/api/employees'), []);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<CandidateSource>('CAREERS_PAGE');
  const [referrerEmployeeId, setReferrerEmployeeId] = useState('');
  const [currentCompany, setCurrentCompany] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [totalExperience, setTotalExperience] = useState('');
  const [location, setLocation] = useState('');
  const [noticePeriodDays, setNoticePeriodDays] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [notes, setNotes] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (resumeUrl.trim() && !resumeFileName.trim()) {
      setError('Please provide a file name for the resume.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const result = await createCandidate({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        source,
        ...(phone.trim() && { phone: phone.trim() }),
        ...(referrerEmployeeId && { referrerEmployeeId }),
        ...(currentCompany.trim() && { currentCompany: currentCompany.trim() }),
        ...(currentTitle.trim() && { currentTitle: currentTitle.trim() }),
        ...(totalExperience && { totalExperience: parseFloat(totalExperience) }),
        ...(location.trim() && { location: location.trim() }),
        ...(noticePeriodDays && { noticePeriodDays: parseInt(noticePeriodDays) }),
        ...(linkedinUrl.trim() && { linkedinUrl: linkedinUrl.trim() }),
        ...(portfolioUrl.trim() && { portfolioUrl: portfolioUrl.trim() }),
        ...(resumeUrl.trim() && { resumeUrl: resumeUrl.trim() }),
        ...(resumeUrl.trim() && resumeFileName.trim() && { resumeFileName: resumeFileName.trim() }),
        ...(notes.trim() && { notes: notes.trim() }),
      });
      router.push(`/recruitment/candidates/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create candidate');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = 'mt-1 block w-full rounded-md border border-input bg-card text-foreground focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';
  const labelCls = 'block text-sm font-medium text-foreground';

  return (
    <div>
      <PageHeader title="Add Candidate" backHref="/recruitment/candidates" />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 rounded-lg border border-border bg-card p-6 shadow-soft">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>First Name *</label>
            <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Last Name *</label>
            <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Email *</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Source *</label>
            <select required value={source} onChange={(e) => setSource(e.target.value as CandidateSource)} className={inputCls}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          {source === 'REFERRAL' && (
            <div>
              <label className={labelCls}>Referred By</label>
              {empLoading ? (
                <p className="mt-1 text-sm text-muted-foreground/70">Loading employees...</p>
              ) : employees && employees.length > 0 ? (
                <select value={referrerEmployeeId} onChange={(e) => setReferrerEmployeeId(e.target.value)} className={inputCls}>
                  <option value="">Select...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              ) : (
                <input value={referrerEmployeeId} onChange={(e) => setReferrerEmployeeId(e.target.value)} className={inputCls} placeholder="Employee ID" />
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Current Company</label>
            <input value={currentCompany} onChange={(e) => setCurrentCompany(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Current Title</label>
            <input value={currentTitle} onChange={(e) => setCurrentTitle(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Experience (years)</label>
            <input type="number" min={0} step="0.5" value={totalExperience} onChange={(e) => setTotalExperience(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Notice Period (days)</label>
            <input type="number" min={0} value={noticePeriodDays} onChange={(e) => setNoticePeriodDays(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>LinkedIn URL</label>
            <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className={inputCls} placeholder="https://linkedin.com/in/..." />
          </div>
          <div>
            <label className={labelCls}>Portfolio URL</label>
            <input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} className={inputCls} />
          </div>
        </div>

        <FileField
          label="Resume"
          fileUrl={resumeUrl}
          fileName={resumeFileName}
          onUrlChange={setResumeUrl}
          onNameChange={setResumeFileName}
          helperText="Paste a link to the candidate's resume"
        />

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
            {submitting ? 'Creating...' : 'Add Candidate'}
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
