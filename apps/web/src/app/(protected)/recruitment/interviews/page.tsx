'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { useAsync, usePermission, useTableParams, sortLocal, paginateLocal } from '@/lib/hooks';
import { listInterviews } from '@/lib/recruitment-api';
import { formatDateTime, employeeName } from '@/lib/format';

export default function InterviewsListPage() {
  const { can } = usePermission();
  const { page, sort, order, pageSize, setPage, setSort, searchParams } =
    useTableParams();
  const applicationId = searchParams.get('applicationId') || '';

  const { data, error, loading, refetch } = useAsync(
    () => (applicationId ? listInterviews(applicationId) : Promise.resolve([])),
    [applicationId],
  );

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'type': return item.type;
          case 'scheduledAt': return item.scheduledAt;
          case 'status': return item.status;
          default: return null;
        }
      }),
    [data, sort, order],
  );

  const { items, total, totalPages } = useMemo(
    () => paginateLocal(sorted, page, pageSize),
    [sorted, page, pageSize],
  );

  return (
    <div>
      <PageHeader
        title="Interviews"
        backHref="/recruitment"
        actions={
          applicationId && can('recruitment.interview.manage') ? (
            <Link
              href={`/recruitment/interviews/new?applicationId=${applicationId}`}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Schedule Interview
            </Link>
          ) : undefined
        }
      />

      {!applicationId && (
        <EmptyState
          title="Select an application"
          description="Navigate to an application detail page and click 'Schedule Interview' to view interviews."
        />
      )}

      {applicationId && loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && total === 0 && applicationId && (
        <EmptyState title="No interviews scheduled" description="Schedule the first interview for this application." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Type" sortKey="type" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Scheduled" sortKey="scheduledAt" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Panelists</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Feedback</th>
                  <SortableHeader label="Status" sortKey="status" currentSort={sort} currentOrder={order} onSort={setSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((interview) => (
                  <tr key={interview.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link href={`/recruitment/interviews/${interview.id}`} className="font-medium text-blue-600 hover:underline">
                        {interview.type.replace(/_/g, ' ')}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatDateTime(interview.scheduledAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{interview.mode.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {interview.interviewers
                        ?.map((p) => (p.employee ? employeeName(p.employee) : p.employeeId))
                        .join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {interview.feedback?.length || 0}/{interview.interviewers?.length || 0}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={interview.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
