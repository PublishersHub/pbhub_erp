'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { Loading } from '@/components/ui/loading';
import { LoadingButton } from '@/components/ui/loading-button';
import { useAsync } from '@/lib/hooks';
import {
  getEmployee,
  updateEmployee,
  upsertEmploymentDetail,
  listDepartments,
  listDesignations,
  listEmployees,
} from '@/lib/employee-api';
import type { Gender, EmploymentType, EmploymentStatus } from '@/types/employee';

const GENDERS: Gender[] = ['MALE', 'FEMALE', 'OTHER'];
const EMPLOYMENT_TYPES: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];
const EMPLOYMENT_STATUSES: EmploymentStatus[] = [
  'ACTIVE',
  'PROBATION',
  'NOTICE_PERIOD',
  'RESIGNED',
  'TERMINATED',
];

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Edit Employee · PbHub';
  }, []);

  const { data: emp, loading: empLoading } = useAsync(() => getEmployee(id), [id]);
  const { data: departments, loading: deptLoading } = useAsync(() => listDepartments(), []);
  const { data: designations, loading: desigLoading } = useAsync(() => listDesignations(), []);
  const { data: employees, loading: empListLoading } = useAsync(() => listEmployees(), []);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [reportingManagerId, setReportingManagerId] = useState('');

  // Employment detail
  const [showEmployment, setShowEmployment] = useState(false);
  const [employmentType, setEmploymentType] = useState<EmploymentType>('FULL_TIME');
  const [joiningDate, setJoiningDate] = useState('');
  const [confirmationDate, setConfirmationDate] = useState('');
  const [probationEndDate, setProbationEndDate] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('ACTIVE');

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (emp && !initialized) {
      setFirstName(emp.firstName);
      setLastName(emp.lastName);
      setDateOfBirth(emp.dateOfBirth ? emp.dateOfBirth.substring(0, 10) : '');
      setGender(emp.gender ?? '');
      setPhone(emp.phone ?? '');
      setPersonalEmail(emp.personalEmail ?? '');
      setDepartmentId(emp.departmentId ?? '');
      setDesignationId(emp.designationId ?? '');
      setReportingManagerId(emp.reportingManagerId ?? '');

      if (emp.employmentDetail) {
        setShowEmployment(true);
        setEmploymentType(emp.employmentDetail.employmentType);
        setJoiningDate(emp.employmentDetail.joiningDate.substring(0, 10));
        setConfirmationDate(
          emp.employmentDetail.confirmationDate
            ? emp.employmentDetail.confirmationDate.substring(0, 10)
            : '',
        );
        setProbationEndDate(
          emp.employmentDetail.probationEndDate
            ? emp.employmentDetail.probationEndDate.substring(0, 10)
            : '',
        );
        setEmploymentStatus(emp.employmentDetail.employmentStatus);
      }
      setInitialized(true);
    }
  }, [emp, initialized]);

  const refsLoading = empLoading || deptLoading || desigLoading || empListLoading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await updateEmployee(id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(dateOfBirth ? { dateOfBirth } : {}),
        ...(gender ? { gender: gender as Gender } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(personalEmail.trim() ? { personalEmail: personalEmail.trim() } : {}),
        ...(departmentId ? { departmentId } : {}),
        ...(designationId ? { designationId } : {}),
        ...(reportingManagerId ? { reportingManagerId } : {}),
      });

      if (showEmployment && joiningDate) {
        await upsertEmploymentDetail(id, {
          employmentType,
          joiningDate,
          ...(confirmationDate && { confirmationDate }),
          ...(probationEndDate && { probationEndDate }),
          employmentStatus,
        });
      }

      router.push(`/employees/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    'mt-1 block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';
  const labelCls = 'block text-sm font-medium text-foreground/80';

  if (refsLoading || !initialized) {
    return (
      <div>
        <PageHeader title="Edit Employee" backHref={`/employees/${id}`} />
        <Loading />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`Edit ${emp?.firstName} ${emp?.lastName}`} backHref={`/employees/${id}`} />

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-5 rounded-lg border border-border bg-card p-6 shadow-soft"
      >
        <h3 className="text-sm font-semibold uppercase text-foreground">Basic Information</h3>

        <div>
          <label className={labelCls}>Employee Code</label>
          <input disabled value={emp?.employeeCode ?? ''} className={`${inputCls} bg-muted`} />
          <p className="mt-1 text-xs text-muted-foreground/70">Employee code cannot be changed</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>First Name *</label>
            <input
              required
              maxLength={100}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Last Name *</label>
            <input
              required
              maxLength={100}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={inputCls}
            >
              <option value="">Select...</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Personal Email</label>
            <input
              type="email"
              value={personalEmail}
              onChange={(e) => setPersonalEmail(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <h3 className="text-sm font-semibold uppercase text-foreground pt-2">Organization</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Department</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className={inputCls}
            >
              <option value="">None</option>
              {(departments ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Designation</label>
            <select
              value={designationId}
              onChange={(e) => setDesignationId(e.target.value)}
              className={inputCls}
            >
              <option value="">None</option>
              {(designations ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Reporting Manager</label>
          <select
            value={reportingManagerId}
            onChange={(e) => setReportingManagerId(e.target.value)}
            className={inputCls}
          >
            <option value="">None</option>
            {(employees ?? [])
              .filter((e) => e.id !== id)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} ({e.employeeCode})
                </option>
              ))}
          </select>
        </div>

        {/* Employment Detail */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="showEmployment"
            checked={showEmployment}
            onChange={(e) => setShowEmployment(e.target.checked)}
            className="rounded border-input"
          />
          <label
            htmlFor="showEmployment"
            className="text-sm font-semibold uppercase text-foreground"
          >
            Employment Detail
          </label>
        </div>

        {showEmployment && (
          <div className="space-y-4 rounded-md border border-border bg-secondary/30 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Employment Type *</label>
                <select
                  required
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                  className={inputCls}
                >
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Employment Status</label>
                <select
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
                  className={inputCls}
                >
                  {EMPLOYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Joining Date *</label>
                <input
                  type="date"
                  required={showEmployment}
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Confirmation Date</label>
                <input
                  type="date"
                  value={confirmationDate}
                  onChange={(e) => setConfirmationDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Probation End Date</label>
                <input
                  type="date"
                  value={probationEndDate}
                  onChange={(e) => setProbationEndDate(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}

        {error && <ErrorMessage message={error} />}

        <div className="flex gap-3">
          <LoadingButton type="submit" loading={submitting} loadingText="Saving…">
            Save Changes
          </LoadingButton>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 motion-press transition-colors px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
