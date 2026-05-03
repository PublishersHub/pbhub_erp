'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { Loading } from '@/components/ui/loading';
import { FileField } from '@/components/files/file-field';
import { createApplication, listRequisitions, listCandidates, listPostings } from '@/lib/recruitment-api';
import { useAsync } from '@/lib/hooks';
import type { CandidateSource } from '@/types/recruitment';

const SOURCES: CandidateSource[] = [
  'CAREERS_PAGE', 'LINKEDIN', 'INDEED', 'REFERRAL', 'AGENCY', 'DIRECT_OUTREACH', 'WALK_IN', 'OTHER',
];

export default function CreateApplicationPage() {
  useEffect(() => {
    document.title = 'New Application · PbHub';
  }, []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCandidateId = searchParams.get('candidateId') || '';
  const presetRequisitionId = searchParams.get('requisitionId') || '';

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: candidates, loading: candLoading } = useAsync(() => listCandidates(), []);
  const { data: requisitions, loading: reqLoading } = useAsync(() => listRequisitions({ status: 'OPEN' }), []);

  const refsLoading = candLoading || reqLoading;

  const [candidateId, setCandidateId] = useState(presetCandidateId);
  const [requisitionId, setRequisitionId] = useState(presetRequisitionId);
  const [postingId, setPostingId] = useState('');
  const [source, setSource] = useState<CandidateSource>('CAREERS_PAGE');
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');

  // Load postings when a requisition is selected
  const { data: postings } = useAsync(
    () => (requisitionId ? listPostings(requisitionId) : Promise.resolve([])),
    [requisitionId],
  );

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
      const result = await createApplication({
        candidateId,
        jobRequisitionId: requisitionId,
        source,
        ...(postingId && { jobPostingId: postingId }),
        ...(coverLetter.trim() && { coverLetter: coverLetter.trim() }),
        ...(resumeUrl.trim() && { resumeUrl: resumeUrl.trim() }),
        ...(resumeUrl.trim() && resumeFileName.trim() && { resumeFileName: resumeFileName.trim() }),
        ...(expectedSalary && { expectedSalary: parseFloat(expectedSalary) }),
      });
      router.push(`/recruitment/applications/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create application');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = 'mt-1 block w-full rounded-md border border-input bg-card text-foreground focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';
  const labelCls = 'block text-sm font-medium text-foreground';

  if (refsLoading) {
    return (
      <div>
        <PageHeader title="Create Application" backHref="/recruitment/applications" />
        <Loading />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Create Application" backHref="/recruitment/applications" />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 rounded-lg border border-border bg-card p-6 shadow-soft">
        <div>
          <label className={labelCls}>Candidate *</label>
          {candidates && candidates.length > 0 ? (
            <select required value={candidateId} onChange={(e) => setCandidateId(e.target.value)} className={inputCls}>
              <option value="">Select candidate...</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>
              ))}
            </select>
          ) : (
            <input required value={candidateId} onChange={(e) => setCandidateId(e.target.value)} className={inputCls} placeholder="Candidate ID" />
          )}
        </div>

        <div>
          <label className={labelCls}>Requisition *</label>
          {requisitions && requisitions.length > 0 ? (
            <select required value={requisitionId} onChange={(e) => { setRequisitionId(e.target.value); setPostingId(''); }} className={inputCls}>
              <option value="">Select requisition...</option>
              {requisitions.map((r) => (
                <option key={r.id} value={r.id}>{r.requisitionNumber} — {r.title}</option>
              ))}
            </select>
          ) : (
            <input required value={requisitionId} onChange={(e) => setRequisitionId(e.target.value)} className={inputCls} placeholder="Requisition ID (no open requisitions found)" />
          )}
        </div>

        {postings && postings.length > 0 && (
          <div>
            <label className={labelCls}>Job Posting</label>
            <select value={postingId} onChange={(e) => setPostingId(e.target.value)} className={inputCls}>
              <option value="">None (direct application)</option>
              {postings.map((p) => (
                <option key={p.id} value={p.id}>{p.title} ({p.channel})</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Source *</label>
            <select required value={source} onChange={(e) => setSource(e.target.value as CandidateSource)} className={inputCls}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Expected Salary</label>
            <input type="number" min={0} step="0.01" value={expectedSalary} onChange={(e) => setExpectedSalary(e.target.value)} className={inputCls} />
          </div>
        </div>

        <FileField
          label="Resume"
          fileUrl={resumeUrl}
          fileName={resumeFileName}
          onUrlChange={setResumeUrl}
          onNameChange={setResumeFileName}
          helperText="Paste a link to the applicant's resume (overrides candidate resume)"
        />

        <div>
          <label className={labelCls}>Cover Letter</label>
          <textarea rows={4} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} className={inputCls} />
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 motion-press disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Application'}
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
