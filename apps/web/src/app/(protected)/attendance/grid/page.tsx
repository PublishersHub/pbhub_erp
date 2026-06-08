'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { useAsync, usePermission } from '@/lib/hooks';
import { getMonthlyGrid, setDayAttendance, type MonthlyGridCell } from '@/lib/attendance-api';
import { formatCurrency } from '@/lib/format';
import type { AttendanceStatus } from '@/types/attendance';

function defaultMonth(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const STATUS_BG: Record<NonNullable<AttendanceStatus>, string> = {
  PRESENT: 'bg-green-50 text-green-700',
  ABSENT: 'bg-red-50 text-red-700',
  LATE: 'bg-amber-50 text-amber-700',
  HALF_DAY: 'bg-yellow-50 text-yellow-700',
  ON_LEAVE: 'bg-blue-50 text-blue-700',
  HOLIDAY: 'bg-purple-50 text-purple-700',
  WEEKEND: 'bg-gray-100 text-gray-500',
};

const STATUS_LABEL: Record<NonNullable<AttendanceStatus>, string> = {
  PRESENT: 'P',
  ABSENT: 'A',
  LATE: 'L',
  HALF_DAY: 'H',
  ON_LEAVE: 'LV',
  HOLIDAY: 'HD',
  WEEKEND: '—',
};

interface EditTarget {
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
}

export default function AttendanceGridPage() {
  const { can } = usePermission();
  const canEdit = can('attendance.read');
  const [month, setMonth] = useState(defaultMonth());

  const { data, error, loading, refetch } = useAsync(() => getMonthlyGrid(month), [month]);

  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dayHeaders = useMemo(() => {
    if (!data) return [];
    return data.dates.map((d) => {
      const dt = new Date(d);
      return {
        date: d,
        day: dt.getUTCDate(),
        dayOfWeek: dt.toLocaleDateString('en-US', { weekday: 'short' }),
      };
    });
  }, [data]);

  useEffect(() => {
    if (!editing) setSaveError(null);
  }, [editing]);

  const openEdit = (
    employeeId: string,
    employeeName: string,
    cell: MonthlyGridCell,
  ) => {
    if (!canEdit) return;
    setEditing({
      employeeId,
      employeeName,
      date: cell.date,
      checkIn: formatTime(cell.checkIn),
      checkOut: formatTime(cell.checkOut),
    });
  };

  const submitEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setSaveError(null);
    try {
      await setDayAttendance({
        employeeId: editing.employeeId,
        date: editing.date,
        checkIn: editing.checkIn || null,
        checkOut: editing.checkOut || null,
      });
      setEditing(null);
      refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Attendance Grid"
        description={
          canEdit
            ? 'Click any cell to edit check-in / out for that day.'
            : 'Monthly attendance matrix with earned-salary projection.'
        }
        backHref="/attendance"
      />

      {/* Month picker */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Month</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <Link
          href="/attendance/daily"
          className="ml-auto text-xs text-gray-500 hover:text-gray-700"
        >
          Daily summary view →
        </Link>
      </div>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && data.rows.length === 0 && (
        <EmptyState
          title="No active employees"
          description="Add employees to see the attendance grid."
        />
      )}

      {data && data.rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th
                  rowSpan={2}
                  className="sticky left-0 z-10 min-w-[180px] border-r bg-gray-50 px-3 py-2 text-left font-semibold uppercase text-gray-600"
                >
                  Employee
                </th>
                {dayHeaders.map((h) => (
                  <th
                    key={h.date}
                    className="border-l px-1 py-1 text-center font-semibold text-gray-600"
                    style={{ minWidth: 56 }}
                  >
                    <div>{h.day}</div>
                    <div className="text-[10px] font-normal text-gray-400">{h.dayOfWeek}</div>
                  </th>
                ))}
                <th
                  rowSpan={2}
                  className="border-l bg-gray-50 px-3 py-2 text-center font-semibold uppercase text-gray-600"
                >
                  Days
                </th>
                <th
                  rowSpan={2}
                  className="border-l bg-gray-50 px-3 py-2 text-right font-semibold uppercase text-gray-600"
                >
                  Gross
                </th>
                <th
                  rowSpan={2}
                  className="border-l bg-gray-50 px-3 py-2 text-right font-semibold uppercase text-gray-600"
                >
                  Earned
                </th>
              </tr>
              <tr className="bg-gray-50" />
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.employee.id} className="border-t hover:bg-gray-50/30">
                  <td className="sticky left-0 z-10 border-r bg-white px-3 py-2 text-sm">
                    <Link
                      href={`/employees/${row.employee.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {row.employee.firstName} {row.employee.lastName}
                    </Link>
                    <div className="text-[11px] text-gray-500">
                      {row.employee.employeeCode}
                      {row.employee.department && ` · ${row.employee.department.name}`}
                    </div>
                  </td>
                  {row.cells.map((cell) => {
                    const status = cell.status;
                    const cellClass = status ? STATUS_BG[status] : 'bg-white text-gray-400';
                    const label = status ? STATUS_LABEL[status] : '';
                    const ci = formatTime(cell.checkIn);
                    const co = formatTime(cell.checkOut);
                    const tip = canEdit ? 'Click to edit' : status ?? '—';
                    return (
                      <td
                        key={cell.date}
                        title={tip}
                        onClick={() =>
                          openEdit(
                            row.employee.id,
                            `${row.employee.firstName} ${row.employee.lastName}`,
                            cell,
                          )
                        }
                        className={`border-l px-1 py-1 text-center align-middle ${cellClass} ${
                          canEdit ? 'cursor-pointer hover:ring-2 hover:ring-blue-300' : ''
                        }`}
                        style={{ minWidth: 56 }}
                      >
                        <div className="text-[11px] font-bold">{label}</div>
                        {ci && <div className="text-[9px] leading-tight text-gray-600">{ci}</div>}
                        {co && <div className="text-[9px] leading-tight text-gray-600">{co}</div>}
                      </td>
                    );
                  })}
                  <td className="border-l px-3 py-2 text-center text-sm text-gray-700">
                    {row.effectiveWorkedDays.toFixed(1)}/{row.workingDayCount}
                  </td>
                  <td className="border-l px-3 py-2 text-right text-sm text-gray-700">
                    {row.grossSalary !== null ? formatCurrency(row.grossSalary) : '—'}
                  </td>
                  <td className="border-l px-3 py-2 text-right text-sm font-medium text-gray-900">
                    {row.earnedSalary !== null ? formatCurrency(row.earnedSalary) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500">
        <strong>Legend:</strong> P=Present, L=Late, H=Half-day, A=Absent, LV=On leave, HD=Holiday,
        —=Weekend. Earned salary = (gross / working-day count) × effective days worked. v1 preview;
        formula will be refined.
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-1 text-lg font-semibold text-gray-900">Edit attendance</h3>
            <p className="mb-4 text-sm text-gray-500">
              {editing.employeeName} · {editing.date}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Check-in</label>
                <input
                  type="time"
                  value={editing.checkIn}
                  onChange={(e) => setEditing({ ...editing, checkIn: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Check-out</label>
                <input
                  type="time"
                  value={editing.checkOut}
                  onChange={(e) => setEditing({ ...editing, checkOut: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <p className="text-xs text-gray-500">
                Leave both blank to clear the day. Saving overwrites existing logs.
              </p>
            </div>

            {saveError && (
              <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {saveError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitEdit}
                disabled={saving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
