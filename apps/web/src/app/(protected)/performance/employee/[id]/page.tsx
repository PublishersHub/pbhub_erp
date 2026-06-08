'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAsync } from '@/lib/hooks';
import { getEmployee } from '@/lib/employee-api';
import { getAllGoals, getAllReviews } from '@/lib/performance-api';
import { formatDate, employeeName } from '@/lib/format';

export default function PerformanceEmployeePage() {
  const params = useParams<{ id: string }>();
  const employeeId = params.id;

  const { data: emp, error: empErr, loading: empLoading } = useAsync(
    () => getEmployee(employeeId),
    [employeeId],
  );
  const { data: goals, loading: goalsLoading } = useAsync(
    () => getAllGoals(undefined, employeeId),
    [employeeId],
  );
  const { data: reviews, loading: reviewsLoading } = useAsync(
    () => getAllReviews(undefined, employeeId),
    [employeeId],
  );

  if (empLoading) return <Loading />;
  if (empErr) return <ErrorMessage message={empErr} />;
  if (!emp) return null;

  // Group goals by cycle
  const goalsByCycle = new Map<string, typeof goals>();
  (goals ?? []).forEach((g) => {
    const key = g.cycle?.id ?? 'unknown';
    if (!goalsByCycle.has(key)) goalsByCycle.set(key, []);
    goalsByCycle.get(key)!.push(g);
  });

  return (
    <div>
      <PageHeader
        title={employeeName(emp)}
        description={`Performance overview · ${emp.employeeCode}`}
        backHref="/performance/goals"
      />

      {/* Employee summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Department</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {emp.department?.name ?? '—'}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Designation</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {emp.designation?.name ?? '—'}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Reporting manager</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {emp.reportingManager ? employeeName(emp.reportingManager) : '—'}
          </p>
        </div>
      </div>

      {/* Reviews */}
      <div className="mb-8">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Reviews</h3>
        {reviewsLoading && <Loading />}
        {!reviewsLoading && reviews && reviews.length === 0 && (
          <EmptyState
            title="No reviews yet"
            description="Performance reviews will appear here once a cycle is opened."
          />
        )}
        {!reviewsLoading && reviews && reviews.length > 0 && (
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Cycle
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Self
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Manager
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Final
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link
                        href={`/performance/reviews/${r.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {r.cycle?.name ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {r.selfRating ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {r.managerRating ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {r.finalRating ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {formatDate(r.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Goals grouped by cycle */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Goals</h3>
        {goalsLoading && <Loading />}
        {!goalsLoading && goals && goals.length === 0 && (
          <EmptyState
            title="No goals yet"
            description="Goals will appear here once they're created for an open cycle."
          />
        )}
        {!goalsLoading && goals && goals.length > 0 && (
          <div className="space-y-4">
            {Array.from(goalsByCycle.entries()).map(([cycleId, cycleGoals]) => {
              const cycleName = cycleGoals![0].cycle?.name ?? 'Unknown cycle';
              return (
                <div key={cycleId} className="overflow-hidden rounded-lg border bg-white shadow-sm">
                  <div className="border-b bg-gray-50 px-4 py-2 text-xs font-semibold uppercase text-gray-600">
                    {cycleName}
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                          Goal
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                          Weight
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                          Progress
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {cycleGoals!.map((g) => (
                        <tr key={g.id} className="hover:bg-gray-50/40">
                          <td className="px-4 py-2 text-sm">
                            <Link
                              href={`/performance/goals/${g.id}`}
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {g.title}
                            </Link>
                            {g.description && (
                              <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                                {g.description}
                              </p>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-600">
                            {g.weight}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">
                            {g.targetValue ? `${g.currentValue} / ${g.targetValue}` : g.currentValue}
                          </td>
                          <td className="px-4 py-2">
                            <StatusBadge status={g.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
