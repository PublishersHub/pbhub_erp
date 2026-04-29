'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import {
  useAsync,
  usePermission,
  useTableParams,
  sortLocal,
  paginateLocal,
} from '@/lib/hooks';
import { getTodayReport, getMonthlyReport } from '@/lib/attendance-api';
import { employeeName } from '@/lib/format';

export default function AttendanceReportsPage() {
  const { can } = usePermission();
  const canRead = can('attendance.read');
  const { page, sort, order, pageSize, setPage, setSort } = useTableParams();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(currentMonth);

  const { data: todayReport, error: todayError, loading: todayLoading } = useAsync(
    () => (canRead ? getTodayReport() : Promise.resolve(null)),
    [],
  );

  const { data: monthlyData, error: monthlyError, loading: monthlyLoading, refetch: monthlyRefetch } = useAsync(
    () => (canRead ? getMonthlyReport(month) : Promise.resolve(null)),
    [month],
  );

  const employees = monthlyData?.employees ?? [];

  const sorted = useMemo(
    () =>
      sortLocal(employees, sort, order, (item, key) => {
        switch (key) {
          case 'name':
            return item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : '';
          case 'present':
            return item.presentDays;
          case 'absent':
            return item.absentDays;
          case 'late':
            return item.lateDays;
          case 'worked':
            return item.totalWorkedMinutes;
          default:
            return null;
        }
      }),
    [employees, sort, order],
  );

  const { items, total, totalPages } = useMemo(
    () => paginateLocal(sorted, page, pageSize),
    [sorted, page, pageSize],
  );

  function formatMinutes(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  if (!canRead) {
    return (
      <div>
        <PageHeader title="Attendance Reports" />
        <EmptyState title="Access Denied" description="You don't have permission to view reports." />
      </div>
    );
  }

  const todayCards = todayReport
    ? [
        { label: 'Present', value: todayReport.present, color: 'text-green-700 bg-green-50' },
        { label: 'Absent', value: todayReport.absent, color: 'text-red-700 bg-red-50' },
        { label: 'Late', value: todayReport.late, color: 'text-yellow-700 bg-yellow-50' },
        { label: 'Half Day', value: todayReport.halfDay, color: 'text-orange-700 bg-orange-50' },
        { label: 'On Leave', value: todayReport.onLeave, color: 'text-purple-700 bg-purple-50' },
        { label: 'Holiday', value: todayReport.holiday, color: 'text-blue-700 bg-blue-50' },
      ]
    : [];

  return (
    <div>
      <PageHeader title="Attendance Reports" />

      {/* Today's Report */}
      <div className="mb-8">
        <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Today&apos;s Overview</h3>
        {todayLoading && <Loading />}
        {todayError && <ErrorMessage message={todayError} />}
        {todayReport && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {todayCards.map((c) => (
              <div key={c.label} className={`rounded-lg border p-4 ${c.color}`}>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs font-medium">{c.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Report */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <h3 className="text-sm font-semibold uppercase text-gray-500">Monthly Report</h3>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        {monthlyLoading && <Loading />}
        {monthlyError && <ErrorMessage message={monthlyError} onRetry={monthlyRefetch} />}
        {monthlyData && total === 0 && (
          <EmptyState title="No data" description="No attendance data for the selected month." />
        )}
        {monthlyData && total > 0 && (
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <SortableHeader label="Employee" sortKey="name" currentSort={sort} currentOrder={order} onSort={setSort} />
                    <SortableHeader label="Present" sortKey="present" currentSort={sort} currentOrder={order} onSort={setSort} />
                    <SortableHeader label="Absent" sortKey="absent" currentSort={sort} currentOrder={order} onSort={setSort} />
                    <SortableHeader label="Late" sortKey="late" currentSort={sort} currentOrder={order} onSort={setSort} />
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Half Days</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">On Leave</th>
                    <SortableHeader label="Worked" sortKey="worked" currentSort={sort} currentOrder={order} onSort={setSort} />
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Overtime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                        {employeeName(emp.employee)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-green-700">{emp.presentDays}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-red-600">{emp.absentDays}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-yellow-700">{emp.lateDays}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{emp.halfDays}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-purple-700">{emp.onLeaveDays}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{formatMinutes(emp.totalWorkedMinutes)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {emp.totalOvertimeMinutes > 0 ? formatMinutes(emp.totalOvertimeMinutes) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
