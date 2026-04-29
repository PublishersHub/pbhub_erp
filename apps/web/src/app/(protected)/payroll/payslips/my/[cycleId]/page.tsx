'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAsync } from '@/lib/hooks';
import { getMyPayslipDetail } from '@/lib/payroll-api';
import { formatCurrency, formatDate } from '@/lib/format';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MyPayslipDetailPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const { data: payslip, error, loading, refetch } = useAsync(
    () => getMyPayslipDetail(cycleId),
    [cycleId],
  );

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!payslip) return null;

  const cycle = payslip.payrollCycle;
  const title = cycle ? `${MONTHS[cycle.month - 1]} ${cycle.year} Payslip` : 'Payslip';
  const earnings = (payslip.lineItems ?? []).filter((li) => li.type === 'EARNING');
  const deductions = (payslip.lineItems ?? []).filter((li) => li.type === 'DEDUCTION');
  const earningAdj = (payslip.adjustments ?? []).filter((a) => a.type === 'EARNING');
  const deductionAdj = (payslip.adjustments ?? []).filter((a) => a.type === 'DEDUCTION');

  return (
    <div>
      <PageHeader
        title={title}
        backHref="/payroll/payslips/my"
        actions={
          cycle ? <StatusBadge status={cycle.status} /> : undefined
        }
      />

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Base Salary</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(payslip.baseSalary)}</p>
        </div>
        <div className="rounded-lg border bg-green-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-green-600">Gross Earnings</p>
          <p className="mt-1 text-lg font-bold text-green-700">{formatCurrency(payslip.grossEarnings)}</p>
        </div>
        <div className="rounded-lg border bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-red-600">Total Deductions</p>
          <p className="mt-1 text-lg font-bold text-red-700">{formatCurrency(payslip.totalDeductions)}</p>
        </div>
        <div className="rounded-lg border bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-blue-600">Net Payable</p>
          <p className="mt-1 text-lg font-bold text-blue-700">{formatCurrency(payslip.netPayable)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Earnings */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-green-600">Earnings</h3>
          <table className="w-full text-sm">
            <tbody>
              {earnings.map((li) => (
                <tr key={li.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-700">{li.componentName}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(li.amount)}</td>
                </tr>
              ))}
              {earningAdj.map((adj) => (
                <tr key={adj.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-700">
                    {adj.description}
                    <span className="ml-1 text-xs text-gray-400">({adj.category})</span>
                  </td>
                  <td className="py-2 text-right font-medium text-green-700">+{formatCurrency(adj.amount)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300">
                <td className="py-2 font-bold text-gray-900">Total Earnings</td>
                <td className="py-2 text-right font-bold text-green-700">{formatCurrency(payslip.grossEarnings)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deductions */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-red-600">Deductions</h3>
          <table className="w-full text-sm">
            <tbody>
              {deductions.map((li) => (
                <tr key={li.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-700">{li.componentName}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(li.amount)}</td>
                </tr>
              ))}
              {parseFloat(payslip.lossOfPayDeduction) > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-orange-700">Loss of Pay</td>
                  <td className="py-2 text-right font-medium text-orange-700">{formatCurrency(payslip.lossOfPayDeduction)}</td>
                </tr>
              )}
              {deductionAdj.map((adj) => (
                <tr key={adj.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-700">
                    {adj.description}
                    <span className="ml-1 text-xs text-gray-400">({adj.category})</span>
                  </td>
                  <td className="py-2 text-right font-medium text-red-600">{formatCurrency(adj.amount)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300">
                <td className="py-2 font-bold text-gray-900">Total Deductions</td>
                <td className="py-2 text-right font-bold text-red-600">{formatCurrency(payslip.totalDeductions)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance details */}
      <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Attendance Details</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <p className="text-xs text-gray-500">Total Working Days</p>
            <p className="text-sm font-bold text-gray-900">{payslip.totalWorkingDays}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Effective Working Days</p>
            <p className="text-sm font-bold text-gray-900">{payslip.effectiveWorkingDays}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Paid Leave</p>
            <p className="text-sm font-bold text-gray-900">{payslip.paidLeaveDays}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Unpaid Leave</p>
            <p className="text-sm font-bold text-red-600">{payslip.unpaidLeaveDays}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Half Days</p>
            <p className="text-sm font-bold text-gray-900">{payslip.halfDays}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Holidays</p>
            <p className="text-sm font-bold text-gray-900">{payslip.holidayDays}</p>
          </div>
        </div>
      </div>

      {/* Period info */}
      {cycle && (
        <div className="mt-6 rounded-lg border bg-gray-50 p-4 text-center text-xs text-gray-500">
          Pay period: {formatDate(cycle.periodStart)} — {formatDate(cycle.periodEnd)}
        </div>
      )}
    </div>
  );
}
