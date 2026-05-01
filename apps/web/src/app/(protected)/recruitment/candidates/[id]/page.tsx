'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { FileLinkCard } from '@/components/files/file-link-card';
import { useAsync, usePermission } from '@/lib/hooks';
import { getCandidate, updateCandidateBlacklist } from '@/lib/recruitment-api';
import { formatDate } from '@/lib/format';

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermission();
  const { data: candidate, error, loading, refetch } = useAsync(() => getCandidate(id), [id]);
  const [actionError, setActionError] = useState('');
  const [acting, setActing] = useState(false);

  // Blacklist form
  const [showBlacklistForm, setShowBlacklistForm] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');

  async function handleBlacklist() {
    if (!candidate) return;
    setActionError('');
    setActing(true);
    try {
      await updateCandidateBlacklist(id, {
        isBlacklisted: true,
        blacklistReason: blacklistReason.trim() || undefined,
      });
      setShowBlacklistForm(false);
      setBlacklistReason('');
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  }

  async function handleUnblacklist() {
    setActionError('');
    setActing(true);
    try {
      await updateCandidateBlacklist(id, { isBlacklisted: false });
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!candidate) return null;

  return (
    <div>
      <PageHeader
        title={`${candidate.firstName} ${candidate.lastName}`}
        backHref="/recruitment/candidates"
        actions={
          candidate.isBlacklisted ? (
            <span className="inline-flex items-center rounded-full bg-destructive-soft px-3 py-1 text-sm font-medium text-destructive">
              Blacklisted
            </span>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6 shadow-soft">
          <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Profile</h3>
          <dl>
            <DetailRow label="Email">{candidate.email}</DetailRow>
            <DetailRow label="Phone">{candidate.phone}</DetailRow>
            <DetailRow label="Source">{candidate.source.replace(/_/g, ' ')}</DetailRow>
            <DetailRow label="Current Company">{candidate.currentCompany}</DetailRow>
            <DetailRow label="Current Title">{candidate.currentTitle}</DetailRow>
            <DetailRow label="Experience">{candidate.totalExperience != null ? `${candidate.totalExperience} years` : null}</DetailRow>
            <DetailRow label="Location">{candidate.location}</DetailRow>
            <DetailRow label="Notice Period">{candidate.noticePeriodDays != null ? `${candidate.noticePeriodDays} days` : null}</DetailRow>
            {candidate.referrerEmployee && (
              <DetailRow label="Referred By">
                {candidate.referrerEmployee.firstName} {candidate.referrerEmployee.lastName}
              </DetailRow>
            )}
          </dl>

          {(candidate.linkedinUrl || candidate.portfolioUrl || candidate.resumeUrl) && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-foreground mb-2">Links & Documents</h4>
              <div className="space-y-2">
                {candidate.resumeUrl && (
                  <FileLinkCard
                    label="Resume"
                    fileUrl={candidate.resumeUrl}
                    fileName={candidate.resumeFileName || undefined}
                  />
                )}
                {candidate.linkedinUrl && (
                  <FileLinkCard label="LinkedIn" fileUrl={candidate.linkedinUrl} fileName="LinkedIn Profile" />
                )}
                {candidate.portfolioUrl && (
                  <FileLinkCard label="Portfolio" fileUrl={candidate.portfolioUrl} fileName="Portfolio" />
                )}
              </div>
            </div>
          )}

          {candidate.notes && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-foreground">Notes</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{candidate.notes}</p>
            </div>
          )}

          {candidate.blacklistReason && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-destructive">Blacklist Reason</h4>
              <p className="mt-1 text-sm text-muted-foreground">{candidate.blacklistReason}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Actions</h3>
            <div className="space-y-2">
              {can('recruitment.candidate.manage') && (
                candidate.isBlacklisted ? (
                  <button
                    disabled={acting}
                    onClick={handleUnblacklist}
                    className="w-full rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 motion-press disabled:opacity-50"
                  >
                    {acting ? 'Removing...' : 'Remove from Blacklist'}
                  </button>
                ) : !showBlacklistForm ? (
                  <button
                    disabled={acting}
                    onClick={() => setShowBlacklistForm(true)}
                    className="w-full rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 motion-press disabled:opacity-50"
                  >
                    Blacklist Candidate
                  </button>
                ) : (
                  <div className="rounded-md border border-destructive/20 bg-destructive-soft p-3 space-y-2">
                    <textarea
                      placeholder="Blacklist reason (optional)"
                      value={blacklistReason}
                      onChange={(e) => setBlacklistReason(e.target.value)}
                      rows={2}
                      className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1 text-xs focus:border-primary focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={acting}
                        onClick={handleBlacklist}
                        className="rounded-md bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 motion-press disabled:opacity-50"
                      >
                        {acting ? 'Blacklisting...' : 'Confirm Blacklist'}
                      </button>
                      <button
                        onClick={() => { setShowBlacklistForm(false); setBlacklistReason(''); }}
                        className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 motion-press"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              )}
              <Link
                href={`/recruitment/applications?candidateId=${id}`}
                className="block w-full rounded-md border border-border px-4 py-2 text-center text-sm font-medium text-foreground hover:bg-muted/50 motion-press"
              >
                View Applications
              </Link>
              {can('recruitment.application.manage') && (
                <Link
                  href={`/recruitment/applications/new?candidateId=${id}`}
                  className="block w-full rounded-md border border-border px-4 py-2 text-center text-sm font-medium text-foreground hover:bg-muted/50 motion-press"
                >
                  Create Application
                </Link>
              )}
            </div>
            {actionError && <div className="mt-3"><ErrorMessage message={actionError} /></div>}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">Added</h3>
            <p className="text-sm text-muted-foreground">{formatDate(candidate.createdAt)}</p>
          </div>
        </div>
      </div>

      {candidate.applications && candidate.applications.length > 0 && (
        <div className="mt-6 rounded-lg border border-border bg-card p-6 shadow-soft">
          <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Applications</h3>
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Requisition</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Stage</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {candidate.applications.map((app) => (
                <tr key={app.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/recruitment/applications/${app.id}`} className="font-medium text-primary hover:underline">
                      {app.jobRequisition?.title || app.jobRequisitionId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {app.currentStage?.name || '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(app.appliedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
