'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { DetailRow } from '@/components/ui/detail-row';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { useAsync, usePermission } from '@/lib/hooks';
import { getEmployee, deactivateEmployee } from '@/lib/employee-api';
import { formatDate, employeeName } from '@/lib/format';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = usePermission();
  const { data: emp, error, loading, refetch } = useAsync(() => getEmployee(id), [id]);
  const [actionError, setActionError] = useState('');
  const [acting, setActing] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  async function doAction(fn: () => Promise<unknown>) {
    setActionError('');
    setActing(true);
    try {
      await fn();
      setShowDeactivateConfirm(false);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
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

              {can('employee.delete') && emp.isActive && (
                <>
                  {!showDeactivateConfirm ? (
                    <button
                      onClick={() => setShowDeactivateConfirm(true)}
                      className="w-full rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 motion-press transition-colors px-4 py-2 text-sm font-medium"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <div className="rounded-md border border-destructive/20 bg-destructive-soft p-3 space-y-2">
                      <p className="text-xs text-destructive">
                        Are you sure you want to deactivate this employee?
                      </p>
                      <div className="flex gap-2">
                        <button
                          disabled={acting}
                          onClick={() => doAction(() => deactivateEmployee(id))}
                          className="rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 motion-press transition-colors px-3 py-1 text-xs font-medium disabled:opacity-50"
                        >
                          {acting ? 'Deactivating...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setShowDeactivateConfirm(false)}
                          className="rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 motion-press transition-colors px-3 py-1 text-xs font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
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
