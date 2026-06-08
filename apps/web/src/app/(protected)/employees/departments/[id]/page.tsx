'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { useAsync } from '@/lib/hooks';
import { getDepartment, listEmployees } from '@/lib/employee-api';
import { employeeName } from '@/lib/format';

export default function DepartmentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: dept, error: deptErr, loading: deptLoading, refetch } = useAsync(
    () => getDepartment(id),
    [id],
  );
  const { data: employees, loading: empLoading } = useAsync(
    () => listEmployees({ departmentId: id }),
    [id],
  );

  if (deptLoading) return <Loading />;
  if (deptErr) return <ErrorMessage message={deptErr} onRetry={refetch} />;
  if (!dept) return null;

  return (
    <div>
      <PageHeader
        title={dept.name}
        description={`Department · ${dept.code}`}
        backHref="/employees/departments"
      />

      {/* Meta */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Parent department</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {dept.parent ? (
              <Link
                href={`/employees/departments/${dept.parent.id}`}
                className="text-blue-600 hover:underline"
              >
                {dept.parent.name}
              </Link>
            ) : (
              '—'
            )}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Sub-departments</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {dept.children?.length ?? 0}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Employees</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {dept._count?.employees ?? employees?.length ?? 0}
          </p>
        </div>
      </div>

      {/* Sub-departments */}
      {dept.children && dept.children.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Sub-departments</h3>
          <div className="flex flex-wrap gap-2">
            {dept.children.map((c) => (
              <Link
                key={c.id}
                href={`/employees/departments/${c.id}`}
                className="rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Employees */}
      <h3 className="mb-2 text-sm font-semibold text-gray-700">Employees in this department</h3>
      {empLoading && <Loading />}
      {!empLoading && employees && employees.length === 0 && (
        <EmptyState
          title="No employees"
          description="No active employees assigned to this department yet."
        />
      )}
      {!empLoading && employees && employees.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Designation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Personal email
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {e.employeeCode}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <Link
                      href={`/employees/${e.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {employeeName(e)}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {e.designation?.name ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {e.personalEmail ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
