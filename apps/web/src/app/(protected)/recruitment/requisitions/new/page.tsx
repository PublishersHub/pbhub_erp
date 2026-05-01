'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { Loading } from '@/components/ui/loading';
import { createRequisition } from '@/lib/recruitment-api';
import { get } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import type { EmploymentType, DepartmentRef, DesignationRef, EmployeeRef } from '@/types/recruitment';

const EMPLOYMENT_TYPES: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];

export default function CreateRequisitionPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load reference data
  const { data: employees, loading: empLoading } = useAsync(() => get<EmployeeRef[]>('/api/employees'), []);
  const { data: departments, loading: deptLoading } = useAsync(() => get<DepartmentRef[]>('/api/departments'), []);
  const { data: designations, loading: desigLoading } = useAsync(() => get<DesignationRef[]>('/api/designations'), []);

  const refsLoading = empLoading || deptLoading || desigLoading;

  // Form state
  const [title, setTitle] = useState('');
  const [hiringManagerId, setHiringManagerId] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('FULL_TIME');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [numberOfOpenings, setNumberOfOpenings] = useState(1);
  const [location, setLocation] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [targetStartDate, setTargetStartDate] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await createRequisition({
        title: title.trim(),
        hiringManagerId,
        employmentType,
        ...(departmentId && { departmentId }),
        ...(designationId && { designationId }),
        numberOfOpenings,
        ...(location.trim() && { location: location.trim() }),
        ...(minSalary && { minSalary: parseFloat(minSalary) }),
        ...(maxSalary && { maxSalary: parseFloat(maxSalary) }),
        ...(description.trim() && { description: description.trim() }),
        ...(requirements.trim() && { requirements: requirements.trim() }),
        ...(targetStartDate && { targetStartDate }),
      });
      router.push(`/recruitment/requisitions/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create requisition');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = 'mt-1 block w-full rounded-md border border-input bg-card text-foreground focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';
  const labelCls = 'block text-sm font-medium text-foreground';

  if (refsLoading) {
    return (
      <div>
        <PageHeader title="Create Requisition" backHref="/recruitment/requisitions" />
        <Loading />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Create Requisition" backHref="/recruitment/requisitions" />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 rounded-lg border border-border bg-card p-6 shadow-soft">
        <div>
          <label className={labelCls}>Title *</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Senior Backend Engineer" />
        </div>

        <div>
          <label className={labelCls}>Hiring Manager *</label>
          {employees && employees.length > 0 ? (
            <select required value={hiringManagerId} onChange={(e) => setHiringManagerId(e.target.value)} className={inputCls}>
              <option value="">Select...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
              ))}
            </select>
          ) : (
            <input required value={hiringManagerId} onChange={(e) => setHiringManagerId(e.target.value)} className={inputCls} placeholder="Employee ID (no employees found)" />
          )}
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
            <label className={labelCls}>Number of Openings</label>
            <input type="number" min={1} value={numberOfOpenings} onChange={(e) => setNumberOfOpenings(parseInt(e.target.value) || 1)} className={inputCls} />
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
              <input value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputCls} placeholder="No departments found" />
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
              <input value={designationId} onChange={(e) => setDesignationId(e.target.value)} className={inputCls} placeholder="No designations found" />
            )}
          </div>
        </div>

        <div>
          <label className={labelCls}>Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="e.g. Remote, New York" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Min Salary</label>
            <input type="number" min={0} step="0.01" value={minSalary} onChange={(e) => setMinSalary(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Max Salary</label>
            <input type="number" min={0} step="0.01" value={maxSalary} onChange={(e) => setMaxSalary(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Target Start Date</label>
          <input type="date" value={targetStartDate} onChange={(e) => setTargetStartDate(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Requirements</label>
          <textarea rows={3} value={requirements} onChange={(e) => setRequirements(e.target.value)} className={inputCls} />
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 motion-press disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Requisition'}
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
