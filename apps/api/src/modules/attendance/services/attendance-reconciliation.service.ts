import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AttendanceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Nightly reconciliation for attendance daily summaries.
 *
 * Live recompute (in AttendanceService) only writes a row when the employee
 * physically logged time. This service ensures EVERY active employee has a
 * row per civil day with the correct top-level status:
 *
 *   Priority order (per employee, per date):
 *     1. HOLIDAY  — org-level holiday on the date AND date is a working day
 *                   (a holiday on a weekend stays WEEKEND; HOLIDAY otherwise wins)
 *     2. WEEKEND  — date's day-of-week is not in policy.workingDays
 *     3. ON_LEAVE — employee has an APPROVED LeaveRequest covering the date
 *     4. PRESENT/LATE/HALF_DAY — preserve what live recompute set
 *     5. ABSENT   — no logs and none of the above
 *
 * Notes:
 *  - Worked-minutes are preserved if logs exist on a HOLIDAY/WEEKEND/ON_LEAVE
 *    day, and those minutes are reclassified as overtimeMinutes.
 *  - The cron entry point is `reconcileYesterday` (02:00 UTC daily) and it
 *    computes "yesterday" per-org in the org's own timezone.
 */
@Injectable()
export class AttendanceReconciliationService {
  private readonly logger = new Logger(AttendanceReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Cron entry point ────────────────────

  @Cron('0 2 * * *', { timeZone: 'UTC' })
  async reconcileYesterday(): Promise<void> {
    this.logger.log('[cron] starting nightly attendance reconciliation');

    const orgs = await this.prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, timezone: true },
    });

    let totalRows = 0;
    for (const org of orgs) {
      try {
        const yesterday = this.yesterdayInTz(org.timezone || 'UTC');
        const result = await this.reconcileDay(org.id, yesterday);
        totalRows += result.rowsWritten;
        this.logger.log(
          `[cron] org=${org.slug} date=${this.formatDate(yesterday)} rows=${result.rowsWritten}`,
        );
      } catch (err) {
        this.logger.error(
          `[cron] org=${org.slug} reconciliation failed: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    }

    this.logger.log(
      `[cron] finished nightly reconciliation orgs=${orgs.length} rows=${totalRows}`,
    );
  }

  // ─── Per-day reconciliation ──────────────

  /**
   * Ensure a daily summary row exists for every active employee in the org
   * for the given civil day, with the correct status.
   *
   * @param organizationId  org to reconcile
   * @param date            civil-day Date (any time-of-day; we normalize to start-of-day UTC)
   */
  async reconcileDay(
    organizationId: string,
    date: Date,
  ): Promise<{ rowsWritten: number; rowsSkipped: number }> {
    const dayStart = this.startOfDayUtc(date);
    const dayEnd = this.endOfDayUtc(date);
    // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    const dayOfWeek = dayStart.getUTCDay();

    // Org-level holiday on this date?
    const holiday = await this.prisma.holiday.findFirst({
      where: {
        organizationId,
        date: dayStart,
        isActive: true,
      },
    });

    // All active employees in the org
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true },
      select: { id: true },
    });

    if (employees.length === 0) {
      return { rowsWritten: 0, rowsSkipped: 0 };
    }

    const employeeIds = employees.map((e) => e.id);

    // Active policy assignments for the day (per employee), include policy.workingDays
    const assignments = await this.prisma.employeeAttendancePolicyAssignment.findMany({
      where: {
        employeeId: { in: employeeIds },
        effectiveFrom: { lte: dayStart },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: dayStart } }],
        attendancePolicy: { organizationId },
      },
      include: { attendancePolicy: true },
      orderBy: { effectiveFrom: 'desc' },
    });
    // Pick the latest per employee (Map<employeeId, policy.workingDays>)
    const workingDaysByEmployee = new Map<string, number[]>();
    for (const a of assignments) {
      if (!workingDaysByEmployee.has(a.employeeId)) {
        workingDaysByEmployee.set(a.employeeId, a.attendancePolicy.workingDays);
      }
    }

    // Approved leave requests covering this date for these employees
    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: {
        organizationId,
        employeeId: { in: employeeIds },
        status: 'APPROVED',
        startDate: { lte: dayStart },
        endDate: { gte: dayStart },
      },
      select: { employeeId: true },
    });
    const onLeaveEmployeeIds = new Set(leaveRequests.map((r) => r.employeeId));

    // Existing summary rows for the day
    const existingSummaries = await this.prisma.attendanceDailySummary.findMany({
      where: {
        organizationId,
        employeeId: { in: employeeIds },
        date: dayStart,
      },
    });
    const summaryByEmployee = new Map(existingSummaries.map((s) => [s.employeeId, s]));

    let rowsWritten = 0;
    let rowsSkipped = 0;

    for (const emp of employees) {
      const existing = summaryByEmployee.get(emp.id);
      const workingDays = workingDaysByEmployee.get(emp.id) ?? [1, 2, 3, 4, 5];
      const isWorkingDay = workingDays.includes(dayOfWeek);

      // Determine the day-type override status (priority 1-3)
      let overrideStatus: AttendanceStatus | null = null;
      if (holiday && isWorkingDay) {
        overrideStatus = AttendanceStatus.HOLIDAY;
      } else if (!isWorkingDay) {
        overrideStatus = AttendanceStatus.WEEKEND;
      } else if (onLeaveEmployeeIds.has(emp.id)) {
        overrideStatus = AttendanceStatus.ON_LEAVE;
      }

      const totalWorkedMinutes = existing?.totalWorkedMinutes ?? 0;

      if (existing) {
        // Existing row. Only update if we have an override and it doesn't match,
        // OR if the existing status is ABSENT and we have an override.
        if (overrideStatus && existing.status !== overrideStatus) {
          // For HOLIDAY/WEEKEND, reclassify worked time as overtime
          const reclassifyAsOvertime =
            (overrideStatus === AttendanceStatus.HOLIDAY ||
              overrideStatus === AttendanceStatus.WEEKEND) &&
            totalWorkedMinutes > 0;

          await this.prisma.attendanceDailySummary.update({
            where: { id: existing.id },
            data: {
              status: overrideStatus,
              ...(reclassifyAsOvertime && {
                overtimeMinutes: totalWorkedMinutes,
              }),
            },
          });
          rowsWritten++;
        } else {
          rowsSkipped++;
        }
      } else {
        // No row → create one
        const status = overrideStatus ?? AttendanceStatus.ABSENT;
        await this.prisma.attendanceDailySummary.create({
          data: {
            organizationId,
            employeeId: emp.id,
            date: dayStart,
            status,
            totalWorkedMinutes: 0,
            overtimeMinutes: 0,
            lateMinutes: 0,
            earlyDepartureMinutes: 0,
          } satisfies Prisma.AttendanceDailySummaryUncheckedCreateInput,
        });
        rowsWritten++;
      }
    }

    return { rowsWritten, rowsSkipped };
  }

  // ─── Helpers ─────────────────────────────

  /**
   * Returns a Date representing 00:00:00 UTC on the civil day that is
   * "yesterday" in the given IANA timezone.
   *
   * The summary table stores date as @db.Date; Prisma sends UTC midnight,
   * so we materialize the civil day as a UTC-midnight Date.
   */
  private yesterdayInTz(timeZone: string): Date {
    const now = new Date();
    // YYYY-MM-DD of "today" in the org's tz
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const [y, m, d] = fmt.format(now).split('-').map(Number);
    // Build a UTC date for that civil day, then subtract 1 day
    const todayUtc = new Date(Date.UTC(y, m - 1, d));
    todayUtc.setUTCDate(todayUtc.getUTCDate() - 1);
    return todayUtc;
  }

  private startOfDayUtc(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private endOfDayUtc(date: Date): Date {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
  }

  private formatDate(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
