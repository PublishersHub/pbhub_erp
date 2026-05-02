'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/toast';
import { useAsync } from '@/lib/hooks';
import { getMyPayslipDetail, downloadPayslipPdf } from '@/lib/payroll-api';
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
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!payslip) return;
    setDownloading(true);
    try {
      const cycle = payslip.payrollCycle;
      const filename = cycle
        ? `payslip-${cycle.year}-${String(cycle.month).padStart(2, '0')}.pdf`
        : 'payslip.pdf';
      await downloadPayslipPdf(payslip.id, filename);
    } catch (err) {
      toast.error('Download failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDownloading(false);
    }
  }

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
          <div className="flex items-center gap-3">
            {cycle && <StatusBadge status={cycle.status} />}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="motion-press rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-glow-primary transition-all hover:bg-primary/90 disabled:opacity-60"
            >
              {downloading ? 'Generating…' : 'Download PDF'}
            </button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
          <p className="text-xs font-medium uppercase text-muted-foreground">Base Salary</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{formatCurrency(payslip.baseSalary)}</p>
        </div>
        <div className="rounded-lg border border-success/20 bg-success-soft p-4 shadow-soft surface-elevated motion-lift">
          <p className="text-xs font-medium uppercase text-success">Gross Earnings</p>
          <p className="mt-1 text-2xl font-semibold text-success">{formatCurrency(payslip.grossEarnings)}</p>
        </div>
        <div className="rounded-lg border border-destructive/20 bg-destructive-soft p-4 shadow-soft surface-elevated motion-lift">
          <p className="text-xs font-medium uppercase text-destructive">Total Deductions</p>
          <p className="mt-1 text-2xl font-semibold text-destructive">{formatCurrency(payslip.totalDeductions)}</p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary-soft p-4 shadow-soft surface-elevated motion-lift">
          <p className="text-xs font-medium uppercase text-primary">Net Payable</p>
          <p className="mt-1 text-2xl font-semibold text-primary">{formatCurrency(payslip.netPayable)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Earnings */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <h3 className="mb-4 text-sm font-semibold uppercase text-success">Earnings</h3>
          <table className="w-full text-sm">
            <tbody>
              {earnings.map((li) => (
                <tr key={li.id} className="border-b border-border">
                  <td className="py-2 text-foreground">{li.componentName}</td>
                  <td className="py-2 text-right font-medium text-foreground">{formatCurrency(li.amount)}</td>
                </tr>
              ))}
              {earningAdj.map((adj) => (
                <tr key={adj.id} className="border-b border-border">
                  <td className="py-2 text-muted-foreground">
                    {adj.description}
                    <span className="ml-1 text-xs text-muted-foreground/70">({adj.category})</span>
                  </td>
                  <td className="py-2 text-right font-medium text-success">+{formatCurrency(adj.amount)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-primary/20 bg-primary-soft">
                <td className="py-2 font-bold text-foreground">Total Earnings</td>
                <td className="py-2 text-right font-bold text-success">{formatCurrency(payslip.grossEarnings)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deductions */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <h3 className="mb-4 text-sm font-semibold uppercase text-destructive">Deductions</h3>
          <table className="w-full text-sm">
            <tbody>
              {deductions.map((li) => (
                <tr key={li.id} className="border-b border-border">
                  <td className="py-2 text-foreground">{li.componentName}</td>
                  <td className="py-2 text-right font-medium text-foreground">{formatCurrency(li.amount)}</td>
                </tr>
              ))}
              {parseFloat(payslip.lossOfPayDeduction) > 0 && (
                <tr className="border-b border-border">
                  <td className="py-2 text-warning">Loss of Pay</td>
                  <td className="py-2 text-right font-medium text-warning">{formatCurrency(payslip.lossOfPayDeduction)}</td>
                </tr>
              )}
              {deductionAdj.map((adj) => (
                <tr key={adj.id} className="border-b border-border">
                  <td className="py-2 text-muted-foreground">
                    {adj.description}
                    <span className="ml-1 text-xs text-muted-foreground/70">({adj.category})</span>
                  </td>
                  <td className="py-2 text-right font-medium text-destructive">{formatCurrency(adj.amount)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-destructive/20 bg-destructive-soft">
                <td className="py-2 font-bold text-foreground">Total Deductions</td>
                <td className="py-2 text-right font-bold text-destructive">{formatCurrency(payslip.totalDeductions)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance details */}
      <div className="mt-6 rounded-lg border border-border bg-card p-6 shadow-soft">
        <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Attendance Details</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <p className="text-xs text-muted-foreground">Total Working Days</p>
            <p className="text-sm font-bold text-foreground">{payslip.totalWorkingDays}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Effective Working Days</p>
            <p className="text-sm font-bold text-foreground">{payslip.effectiveWorkingDays}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid Leave</p>
            <p className="text-sm font-bold text-foreground">{payslip.paidLeaveDays}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Unpaid Leave</p>
            <p className="text-sm font-bold text-destructive">{payslip.unpaidLeaveDays}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Half Days</p>
            <p className="text-sm font-bold text-foreground">{payslip.halfDays}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Holidays</p>
            <p className="text-sm font-bold text-foreground">{payslip.holidayDays}</p>
          </div>
        </div>
      </div>

      {/* Period info */}
      {cycle && (
        <div className="mt-6 rounded-lg border border-border bg-muted p-4 text-center text-xs text-muted-foreground">
          Pay period: {formatDate(cycle.periodStart)} — {formatDate(cycle.periodEnd)}
        </div>
      )}
    </div>
  );
}
