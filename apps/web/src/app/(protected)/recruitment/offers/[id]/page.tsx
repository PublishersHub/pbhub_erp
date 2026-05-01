'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { FileLinkCard } from '@/components/files/file-link-card';
import { useAsync, usePermission } from '@/lib/hooks';
import {
  getOffer,
  extendOffer,
  respondOffer,
  rescindOffer,
  hireCandidate,
} from '@/lib/recruitment-api';
import { listInstances } from '@/lib/onboarding-api';
import { formatDate, formatDateTime, formatCurrency, employeeName } from '@/lib/format';
import type { OnboardingInstance } from '@/types/onboarding';

export default function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = usePermission();
  const { data: offer, error, loading, refetch } = useAsync(() => getOffer(id), [id]);
  const [actionError, setActionError] = useState('');
  const [acting, setActing] = useState(false);

  // Respond form
  const [showRespondForm, setShowRespondForm] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // Rescind form
  const [showRescindForm, setShowRescindForm] = useState(false);
  const [rescindReason, setRescindReason] = useState('');

  // Hire form
  const [showHireForm, setShowHireForm] = useState(false);
  const [employeeCode, setEmployeeCode] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [workEmail, setWorkEmail] = useState('');

  // Hire success + onboarding lookup
  const [hireResult, setHireResult] = useState<{ employeeId: string; employeeCode: string; firstName: string; lastName: string } | null>(null);
  const [onboardingInstance, setOnboardingInstance] = useState<OnboardingInstance | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  useEffect(() => {
    if (!hireResult) return;
    let cancelled = false;
    setOnboardingLoading(true);
    listInstances({ employeeId: hireResult.employeeId })
      .then((instances) => {
        if (!cancelled && instances.length > 0) {
          setOnboardingInstance(instances[0]);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setOnboardingLoading(false); });
    return () => { cancelled = true; };
  }, [hireResult]);

  async function doAction(fn: () => Promise<unknown>) {
    setActionError('');
    setActing(true);
    try {
      await fn();
      setShowRespondForm(false);
      setShowRescindForm(false);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  }

  async function handleHire() {
    if (!employeeCode.trim() || !joiningDate) return;
    setActionError('');
    setActing(true);
    try {
      const result = await hireCandidate(id, {
        employeeCode: employeeCode.trim(),
        joiningDate,
        ...(workEmail.trim() && { workEmail: workEmail.trim() }),
      });
      setShowHireForm(false);
      setHireResult({ employeeId: result.employee.id, employeeCode: result.employee.employeeCode, firstName: result.employee.firstName, lastName: result.employee.lastName });
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Hire failed');
    } finally {
      setActing(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!offer) return null;

  const candidateName = offer.application?.candidate
    ? `${offer.application.candidate.firstName} ${offer.application.candidate.lastName}`
    : null;

  const canManageOffer = can('recruitment.offer.manage');
  const canExtend = offer.status === 'DRAFT' && canManageOffer;
  const canRespond = offer.status === 'EXTENDED' && canManageOffer;
  const canRescind = ['DRAFT', 'EXTENDED', 'ACCEPTED'].includes(offer.status) && canManageOffer;
  const canHire = offer.status === 'ACCEPTED' && can('recruitment.hire');

  return (
    <div>
      <PageHeader
        title={`Offer ${offer.offerNumber}`}
        description={candidateName || undefined}
        backHref={`/recruitment/offers?applicationId=${offer.applicationId}`}
        actions={<StatusBadge status={offer.status} />}
      />

      {/* Hire success banner */}
      {hireResult && (
        <div className="mb-6 rounded-lg border border-success/20 bg-success-soft p-4">
          <h3 className="text-sm font-semibold text-success">Candidate Hired Successfully</h3>
          <p className="mt-1 text-sm text-success-foreground/80">
            {hireResult.firstName} {hireResult.lastName} has been hired as employee {hireResult.employeeCode}.
          </p>
          <div className="mt-3">
            {onboardingLoading && (
              <p className="text-xs text-success-foreground/60">Checking onboarding status...</p>
            )}
            {!onboardingLoading && onboardingInstance && (
              <Link
                href={`/onboarding/${onboardingInstance.id}`}
                className="inline-flex items-center rounded-md bg-success px-3 py-1.5 text-xs font-medium text-success-foreground hover:bg-success/90 motion-press"
              >
                Open Onboarding
              </Link>
            )}
            {!onboardingLoading && !onboardingInstance && (
              <>
                <p className="text-xs text-success-foreground/60">No onboarding instance was started automatically.</p>
                {can('onboarding.instance.manage') && (
                  <Link
                    href={`/onboarding/new?employeeId=${hireResult.employeeId}`}
                    className="mt-2 inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 motion-press"
                  >
                    Start Onboarding
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6 shadow-soft">
          <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Offer Details</h3>
          <dl>
            <DetailRow label="Offer #">{offer.offerNumber}</DetailRow>
            <DetailRow label="Version">v{offer.version}</DetailRow>
            <DetailRow label="Application">
              <Link href={`/recruitment/applications/${offer.applicationId}`} className="text-blue-600 hover:underline">
                {offer.application?.jobRequisition?.title || offer.applicationId}
              </Link>
            </DetailRow>
            <DetailRow label="Candidate">
              {offer.application?.candidate ? (
                <Link href={`/recruitment/candidates/${offer.application.candidateId}`} className="text-blue-600 hover:underline">
                  {candidateName}
                </Link>
              ) : '—'}
            </DetailRow>
            <DetailRow label="Employment Type">{offer.employmentType.replace(/_/g, ' ')}</DetailRow>
            <DetailRow label="Base Salary">{formatCurrency(offer.baseSalary)} {offer.currency}</DetailRow>
            {offer.joiningBonus && <DetailRow label="Joining Bonus">{formatCurrency(offer.joiningBonus)}</DetailRow>}
            <DetailRow label="Department">{offer.department?.name}</DetailRow>
            <DetailRow label="Designation">{offer.designation?.title}</DetailRow>
            <DetailRow label="Reporting Manager">{offer.reportingManager ? employeeName(offer.reportingManager) : null}</DetailRow>
            <DetailRow label="Proposed Joining">{formatDate(offer.proposedJoiningDate)}</DetailRow>
            <DetailRow label="Expires">{formatDateTime(offer.expiresAt)}</DetailRow>
            {offer.extendedAt && <DetailRow label="Extended">{formatDateTime(offer.extendedAt)}</DetailRow>}
            {offer.extendedBy && <DetailRow label="Extended By">{employeeName(offer.extendedBy)}</DetailRow>}
            {offer.respondedAt && <DetailRow label="Responded">{formatDateTime(offer.respondedAt)}</DetailRow>}
            {offer.declineReason && <DetailRow label="Decline Reason">{offer.declineReason}</DetailRow>}
            {offer.rescindedAt && <DetailRow label="Rescinded">{formatDateTime(offer.rescindedAt)}</DetailRow>}
            {offer.rescindedBy && <DetailRow label="Rescinded By">{employeeName(offer.rescindedBy)}</DetailRow>}
            {offer.rescindReason && <DetailRow label="Rescind Reason">{offer.rescindReason}</DetailRow>}
            {offer.notes && <DetailRow label="Notes">{offer.notes}</DetailRow>}
          </dl>

          {offer.offerLetterUrl && (
            <div className="mt-4">
              <FileLinkCard
                label="Offer Letter"
                fileUrl={offer.offerLetterUrl}
                fileName={offer.offerLetterFileName || undefined}
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Actions</h3>
            <div className="space-y-2">
              {/* Extend */}
              {canExtend && (
                <button
                  disabled={acting}
                  onClick={() => doAction(() => extendOffer(id))}
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 motion-press disabled:opacity-50"
                >
                  {acting ? 'Extending...' : 'Extend Offer'}
                </button>
              )}

              {/* Respond: Accept */}
              {canRespond && !showRespondForm && (
                <>
                  <button
                    disabled={acting}
                    onClick={() => doAction(() => respondOffer(id, { decision: 'ACCEPTED' }))}
                    className="w-full rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 motion-press disabled:opacity-50"
                  >
                    {acting ? 'Recording...' : 'Record Acceptance'}
                  </button>
                  <button
                    onClick={() => { setShowRespondForm(true); setShowRescindForm(false); setShowHireForm(false); }}
                    className="w-full rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 motion-press"
                  >
                    Record Decline
                  </button>
                </>
              )}
              {showRespondForm && (
                <div className="rounded-md border border-destructive/20 bg-destructive-soft p-3 space-y-2">
                  <textarea placeholder="Decline reason (optional)" value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} rows={2} className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1 text-xs focus:border-primary focus:outline-none" />
                  <div className="flex gap-2">
                    <button
                      disabled={acting}
                      onClick={() => doAction(() => respondOffer(id, { decision: 'DECLINED', declineReason: declineReason.trim() || undefined }))}
                      className="rounded-md bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 motion-press disabled:opacity-50"
                    >
                      {acting ? 'Declining...' : 'Confirm Decline'}
                    </button>
                    <button onClick={() => setShowRespondForm(false)} className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 motion-press">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Hire */}
              {canHire && !showHireForm && (
                <button
                  onClick={() => { setShowHireForm(true); setShowRescindForm(false); setJoiningDate(offer.proposedJoiningDate?.split('T')[0] || ''); }}
                  className="w-full rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 motion-press"
                >
                  Hire Candidate
                </button>
              )}
              {showHireForm && (
                <div className="rounded-md border border-success/20 bg-success-soft p-3 space-y-2">
                  <label className="block text-xs font-medium text-success">Employee Code *</label>
                  <input
                    required value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="e.g. EMP-2026-0042"
                    className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                  />
                  <label className="block text-xs font-medium text-success">Joining Date *</label>
                  <input
                    required type="date" value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                  />
                  <label className="block text-xs font-medium text-success">Work Email</label>
                  <input
                    type="email" value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                    placeholder="Defaults to candidate email"
                    className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={acting || !employeeCode.trim() || !joiningDate}
                      onClick={handleHire}
                      className="rounded-md bg-success px-3 py-1 text-xs font-medium text-success-foreground hover:bg-success/90 motion-press disabled:opacity-50"
                    >
                      {acting ? 'Hiring...' : 'Confirm Hire'}
                    </button>
                    <button onClick={() => setShowHireForm(false)} className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 motion-press">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Rescind */}
              {canRescind && !showRescindForm ? (
                <button
                  onClick={() => { setShowRescindForm(true); setShowRespondForm(false); setShowHireForm(false); }}
                  className="w-full rounded-md border border-warning px-4 py-2 text-sm font-medium text-warning hover:bg-warning-soft/30 motion-press"
                >
                  Rescind Offer
                </button>
              ) : canRescind && showRescindForm ? (
                <div className="rounded-md border border-warning/20 bg-warning-soft p-3 space-y-2">
                  <textarea placeholder="Rescind reason (optional)" value={rescindReason} onChange={(e) => setRescindReason(e.target.value)} rows={2} className="block w-full rounded-md border border-input bg-card text-foreground px-2 py-1 text-xs focus:border-primary focus:outline-none" />
                  <div className="flex gap-2">
                    <button
                      disabled={acting}
                      onClick={() => doAction(() => rescindOffer(id, { reason: rescindReason.trim() || undefined }))}
                      className="rounded-md bg-warning px-3 py-1 text-xs font-medium text-warning-foreground hover:bg-warning/90 motion-press disabled:opacity-50"
                    >
                      {acting ? 'Rescinding...' : 'Confirm Rescind'}
                    </button>
                    <button onClick={() => setShowRescindForm(false)} className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 motion-press">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            {actionError && <div className="mt-3"><ErrorMessage message={actionError} /></div>}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">Created</h3>
            <p className="text-sm text-muted-foreground">{formatDateTime(offer.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
