'use client';

import { useState } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmployeeAvatar } from '@/components/ui/employee-avatar';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/toast';
import { useAsync, usePermission } from '@/lib/hooks';
import { useAuth } from '@/context/auth-context';
import { getEmployee, deactivateEmployee, downloadEmployeeIdCard } from '@/lib/employee-api';
import { formatDate, employeeName } from '@/lib/format';
import { PerformanceNotesCard } from '@/components/performance-notes-card';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = usePermission();
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const { data: emp, error, loading, refetch } = useAsync(() => getEmployee(id), [id]);
  const [actionError, setActionError] = useState('');
  const [acting, setActing] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);

  useDocumentTitle(emp ? `${emp.firstName} ${emp.lastName}` : 'Employee');

  async function handleDownloadIdCard() {
    if (!emp || downloadingCard) return;
    setDownloadingCard(true);
    try {
      await downloadEmployeeIdCard(emp.id, `id-card-${emp.employeeCode}.pdf`);
    } catch (err) {
      toast.error(
        'Failed to download ID card',
        err instanceof Error ? err.message : 'Please try again',
      );
    } finally {
      setDownloadingCard(false);
    }
  }

  async function handleDeactivate() {
    if (!emp) return;
    const ok = await confirm({
      title: 'Deactivate employee?',
      description: `This will mark ${emp.firstName} ${emp.lastName} as inactive. You can reactivate later.`,
      confirmLabel: 'Deactivate',
      tone: 'warning',
    });
    if (!ok) return;
    setActionError('');
    setActing(true);
    try {
      await deactivateEmployee(id);
      toast.success('Employee deactivated', `${emp.firstName} ${emp.lastName}`);
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      setActionError(msg);
      toast.error('Failed to deactivate', msg);
    } finally {
      setActing(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!emp) return null;

  return (
    <div>
      <PageHeader
        title={`${emp.firstName} ${emp.lastName}`}
        backHref="/employees"
        actions={
          <div className="flex items-center gap-2">
            {emp.isActive ? (
              <span className="inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                Inactive
              </span>
            )}
          </div>
        }
      />

      {/* Identity row — avatar + headline */}
      <div className="mb-6 flex items-center gap-4 rounded-lg border border-border bg-card p-5 shadow-soft">
        <EmployeeAvatar
          size={64}
          firstName={emp.firstName}
          lastName={emp.lastName}
          imageUrl={emp.profileImageUrl}
          seed={emp.id}
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">
            {emp.firstName} {emp.lastName}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {emp.designation?.name ?? 'No designation'}
            {emp.department?.name ? ` · ${emp.department.name}` : ''}
          </p>
          {emp.employeeCode && (
            <p className="mt-0.5 text-xs text-muted-foreground/70">{emp.employeeCode}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">
              Basic Information
            </h3>
            <dl>
              <DetailRow label="Employee Code">{emp.employeeCode}</DetailRow>
              <DetailRow label="Full Name">
                {emp.firstName} {emp.lastName}
              </DetailRow>
              <DetailRow label="Gender">{emp.gender ?? '—'}</DetailRow>
              <DetailRow label="Date of Birth">{formatDate(emp.dateOfBirth)}</DetailRow>
              <DetailRow label="Phone">{emp.phone}</DetailRow>
              <DetailRow label="Personal Email">{emp.personalEmail}</DetailRow>
            </dl>
          </div>

          {/* Organization Info */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Organization</h3>
            <dl>
              <DetailRow label="Department">{emp.department?.name}</DetailRow>
              <DetailRow label="Designation">{emp.designation?.name}</DetailRow>
              <DetailRow label="Reporting Manager">
                {emp.reportingManager ? (
                  <Link
                    href={`/employees/${emp.reportingManager.id}`}
                    className="text-primary hover:underline"
                  >
                    {employeeName(emp.reportingManager)}
                  </Link>
                ) : (
                  '—'
                )}
              </DetailRow>
            </dl>
          </div>

          {/* Employment Detail */}
          {emp.employmentDetail && (
            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
              <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">
                Employment Detail
              </h3>
              <dl>
                <DetailRow label="Employment Type">
                  <StatusBadge status={emp.employmentDetail.employmentType} />
                </DetailRow>
                <DetailRow label="Employment Status">
                  <StatusBadge status={emp.employmentDetail.employmentStatus} />
                </DetailRow>
                <DetailRow label="Joining Date">
                  {formatDate(emp.employmentDetail.joiningDate)}
                </DetailRow>
                <DetailRow label="Confirmation Date">
                  {formatDate(emp.employmentDetail.confirmationDate)}
                </DetailRow>
                <DetailRow label="Probation End Date">
                  {formatDate(emp.employmentDetail.probationEndDate)}
                </DetailRow>
                {emp.employmentDetail.resignationDate && (
                  <DetailRow label="Resignation Date">
                    {formatDate(emp.employmentDetail.resignationDate)}
                  </DetailRow>
                )}
                {emp.employmentDetail.lastWorkingDate && (
                  <DetailRow label="Last Working Date">
                    {formatDate(emp.employmentDetail.lastWorkingDate)}
                  </DetailRow>
                )}
              </dl>
            </div>
          )}

          {/* Performance Notes — visible to managers/HR (perf.review) and to the
              subject themselves (read-only public notes via the API rule). */}
          {(can('performance.review') ||
            can('performance.manage') ||
            emp.userId === user?.user?.id) && (
            <PerformanceNotesCard
              employeeId={emp.id}
              canCompose={can('performance.review') || can('performance.manage')}
            />
          )}

          {/* Direct Reports */}
          {emp.directReports && emp.directReports.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
              <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">
                Direct Reports ({emp.directReports.length})
              </h3>
              <div className="space-y-2">
                {emp.directReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/employees/${report.id}`}
                    className="block rounded-md border border-border px-3 py-2 text-sm text-primary hover:bg-muted/50 hover:underline transition-colors"
                  >
                    {report.firstName} {report.lastName}
                    {report.employeeCode && (
                      <span className="ml-2 text-muted-foreground/70">({report.employeeCode})</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Actions</h3>
            <div className="space-y-2">
              {can('employee.update') && (
                <button
                  onClick={() => router.push(`/employees/${id}/edit`)}
                  className="w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium"
                >
                  Edit Employee
                </button>
              )}

              {(can('employee.read') || emp.userId === user?.user?.id) && (
                <button
                  onClick={handleDownloadIdCard}
                  disabled={downloadingCard}
                  className="w-full rounded-md border border-border bg-card text-foreground hover:bg-muted motion-press transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {downloadingCard ? 'Preparing…' : 'Download ID Card'}
                </button>
              )}

              {can('employee.delete') && emp.isActive && (
                <button
                  onClick={handleDeactivate}
                  disabled={acting}
                  className="w-full rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 motion-press transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {acting ? 'Deactivating...' : 'Deactivate'}
                </button>
              )}
            </div>
            {actionError && (
              <div className="mt-3">
                <ErrorMessage message={actionError} />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">Created</h3>
            <p className="text-sm text-muted-foreground">{formatDate(emp.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
