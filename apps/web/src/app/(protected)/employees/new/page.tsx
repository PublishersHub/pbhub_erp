'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { Loading } from '@/components/ui/loading';
import { LoadingButton } from '@/components/ui/loading-button';
import { useAsync } from '@/lib/hooks';
import { createEmployee, listDepartments, listDesignations, listEmployees } from '@/lib/employee-api';
import type { Gender, EmploymentType, EmploymentStatus } from '@/types/employee';

const GENDERS: Gender[] = ['MALE', 'FEMALE', 'OTHER'];
const EMPLOYMENT_TYPES: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];
const EMPLOYMENT_STATUSES: EmploymentStatus[] = ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'RESIGNED', 'TERMINATED'];

export default function CreateEmployeePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Add Employee · PbHub';
  }, []);

  const { data: departments, loading: deptLoading } = useAsync(() => listDepartments(), []);
  const { data: designations, loading: desigLoading } = useAsync(() => listDesignations(), []);
  const { data: employees, loading: empLoading } = useAsync(() => listEmployees(), []);

  const refsLoading = deptLoading || desigLoading || empLoading;

  // Form state
  const [employeeCode, setEmployeeCode] = useState('');
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
  const [includeEmployment, setIncludeEmployment] = useState(false);
  const [employmentType, setEmploymentType] = useState<EmploymentType>('FULL_TIME');
  const [joiningDate, setJoiningDate] = useState('');
  const [confirmationDate, setConfirmationDate] = useState('');
  const [probationEndDate, setProbationEndDate] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('ACTIVE');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await createEmployee({
        employeeCode: employeeCode.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(dateOfBirth && { dateOfBirth }),
        ...(gender && { gender: gender as Gender }),
        ...(phone.trim() && { phone: phone.trim() }),
        ...(personalEmail.trim() && { personalEmail: personalEmail.trim() }),
        ...(departmentId && { departmentId }),
        ...(designationId && { designationId }),
        ...(reportingManagerId && { reportingManagerId }),
        ...(includeEmployment &&
          joiningDate && {
            employmentDetail: {
              employmentType,
              joiningDate,
              ...(confirmationDate && { confirmationDate }),
              ...(probationEndDate && { probationEndDate }),
              employmentStatus,
            },
          }),
      });
      router.push(`/employees/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    'mt-1 block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';
  const labelCls = 'block text-sm font-medium text-foreground/80';

  if (refsLoading) {
    return (
      <div>
        <PageHeader title="Add Employee" backHref="/employees" />
        <Loading />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Add Employee" backHref="/employees" />

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-5 rounded-lg border border-border bg-card p-6 shadow-soft"
      >
        <h3 className="text-sm font-semibold uppercase text-foreground">Basic Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Employee Code *</label>
            <input
              required
              maxLength={20}
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className={inputCls}
              placeholder="e.g. EMP-001"
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
            <label className={labelCls}>Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
            />
          </div>
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
            {(employees ?? []).map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} ({emp.employeeCode})
              </option>
            ))}
          </select>
        </div>

        {/* Employment Detail section */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="includeEmployment"
            checked={includeEmployment}
            onChange={(e) => setIncludeEmployment(e.target.checked)}
            className="rounded border-input"
          />
          <label htmlFor="includeEmployment" className="text-sm font-semibold uppercase text-foreground">
            Include Employment Detail
          </label>
        </div>

        {includeEmployment && (
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
                  required={includeEmployment}
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
          <LoadingButton type="submit" loading={submitting} loadingText="Creating…">
            Add Employee
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
