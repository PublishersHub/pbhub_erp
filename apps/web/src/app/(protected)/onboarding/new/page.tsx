'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { Loading } from '@/components/ui/loading';
import { useAsync } from '@/lib/hooks';
import { createInstance, listTemplates } from '@/lib/onboarding-api';

export default function StartOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: templates, loading: tplLoading } = useAsync(() => listTemplates());

  const [employeeId, setEmployeeId] = useState(searchParams.get('employeeId') ?? '');
  const [joiningDate, setJoiningDate] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId.trim() || !joiningDate) return;
    setError('');
    setSubmitting(true);
    try {
      const inst = await createInstance({
        employeeId: employeeId.trim(),
        joiningDate,
        ...(templateId && { templateId }),
      });
      router.push(`/onboarding/${inst.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start onboarding');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Start Onboarding" backHref="/onboarding" />

      <div className="mx-auto max-w-lg rounded-lg border bg-white p-6 shadow-sm">
        {tplLoading && <Loading />}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID *</label>
            <input
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="Employee UUID"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
            <input
              required
              type="date"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Use default template</option>
              {templates?.filter((t) => t.isActive).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.isDefault ? ' (Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          {error && <ErrorMessage message={error} />}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || !employeeId.trim() || !joiningDate}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Starting...' : 'Start Onboarding'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
