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
            <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
              Blacklisted
            </span>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Profile</h3>
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
              <h4 className="text-sm font-medium text-gray-700 mb-2">Links & Documents</h4>
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
              <h4 className="text-sm font-medium text-gray-700">Notes</h4>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{candidate.notes}</p>
            </div>
          )}

          {candidate.blacklistReason && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-red-600">Blacklist Reason</h4>
              <p className="mt-1 text-sm text-gray-600">{candidate.blacklistReason}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Actions</h3>
            <div className="space-y-2">
              {can('recruitment.candidate.manage') && (
                candidate.isBlacklisted ? (
                  <button
                    disabled={acting}
                    onClick={handleUnblacklist}
                    className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {acting ? 'Removing...' : 'Remove from Blacklist'}
                  </button>
                ) : !showBlacklistForm ? (
                  <button
                    disabled={acting}
                    onClick={() => setShowBlacklistForm(true)}
                    className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Blacklist Candidate
                  </button>
                ) : (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-2">
                    <textarea
                      placeholder="Blacklist reason (optional)"
                      value={blacklistReason}
                      onChange={(e) => setBlacklistReason(e.target.value)}
                      rows={2}
                      className="block w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-red-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={acting}
                        onClick={handleBlacklist}
                        className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {acting ? 'Blacklisting...' : 'Confirm Blacklist'}
                      </button>
                      <button
                        onClick={() => { setShowBlacklistForm(false); setBlacklistReason(''); }}
                        className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              )}
              <Link
                href={`/recruitment/applications?candidateId=${id}`}
                className="block w-full rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                View Applications
              </Link>
              {can('recruitment.application.manage') && (
                <Link
                  href={`/recruitment/applications/new?candidateId=${id}`}
                  className="block w-full rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Create Application
                </Link>
              )}
            </div>
            {actionError && <div className="mt-3"><ErrorMessage message={actionError} /></div>}
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold uppercase text-gray-500">Added</h3>
            <p className="text-sm text-gray-600">{formatDate(candidate.createdAt)}</p>
          </div>
        </div>
      </div>

      {candidate.applications && candidate.applications.length > 0 && (
        <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Applications</h3>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Requisition</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Stage</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {candidate.applications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/recruitment/applications/${app.id}`} className="font-medium text-blue-600 hover:underline">
                      {app.jobRequisition?.title || app.jobRequisitionId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {app.currentStage?.name || '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(app.appliedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
