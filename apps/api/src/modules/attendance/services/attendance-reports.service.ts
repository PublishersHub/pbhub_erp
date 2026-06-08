import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';

export interface EmployeeBasicInfo {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

export interface EmployeeMonthlyEntry {
  employee: EmployeeBasicInfo;
  totalWorkedMinutes: number;
  totalOvertimeMinutes: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  onLeaveDays: number;
  holidayDays: number;
  weekendDays: number;
}

@Injectable()
export class AttendanceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Daily Organization Snapshot ────────

  async getOrganizationSummary(organizationId: string, date: Date) {
    const utcDate = this.startOfDayUTC(date);

    const totalEmployees = await this.prisma.employee.count({
      where: { organizationId, isActive: true },
    });

    const grouped = await this.prisma.attendanceDailySummary.groupBy({
      by: ['status'],
      where: { organizationId, date: utcDate },
      _count: { status: true },
    });

    // Single pass over grouped results
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let onLeaveCount = 0;
    let holidayCount = 0;
    let weekendCount = 0;

    for (const row of grouped) {
      const c = row._count.status;
      switch (row.status) {
        case AttendanceStatus.PRESENT:  presentCount = c;  break;
        case AttendanceStatus.LATE:     lateCount = c;     break;
        case AttendanceStatus.HALF_DAY: halfDayCount = c;  break;
        case AttendanceStatus.ON_LEAVE: onLeaveCount = c;  break;
        case AttendanceStatus.HOLIDAY:  holidayCount = c;  break;
        case AttendanceStatus.WEEKEND:  weekendCount = c;  break;
      }
    }

    const absentCount = totalEmployees
      - (presentCount + lateCount + halfDayCount + onLeaveCount + holidayCount + weekendCount);

    return {
      date: utcDate,
      totalEmployees,
      presentCount,
      absentCount,
      lateCount,
      halfDayCount,
      onLeaveCount,
      holidayCount,
      weekendCount,
    };
  }

  // ─── Employee Monthly Report ───────────

  async getEmployeeMonthlyReport(
    organizationId: string,
    employeeId: string,
    month: string,
  ) {
    this.validateMonthFormat(month);

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found in this organization');
    }

    const { start, end, totalDaysInMonth } = this.parseMonth(month);

    const summaries = await this.prisma.attendanceDailySummary.findMany({
      where: {
        employeeId,
        organizationId,
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });

    let totalWorkedMinutes = 0;
    let totalOvertimeMinutes = 0;
    let presentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let onLeaveDays = 0;
    let holidayDays = 0;
    let weekendDays = 0;

    for (const s of summaries) {
      totalWorkedMinutes += s.totalWorkedMinutes;
      totalOvertimeMinutes += s.overtimeMinutes;
      switch (s.status) {
        case AttendanceStatus.PRESENT:  presentDays++;  break;
        case AttendanceStatus.LATE:     lateDays++;     break;
        case AttendanceStatus.HALF_DAY: halfDays++;     break;
        case AttendanceStatus.ON_LEAVE: onLeaveDays++;  break;
        case AttendanceStatus.HOLIDAY:  holidayDays++;  break;
        case AttendanceStatus.WEEKEND:  weekendDays++;  break;
      }
    }

    const absentDays = totalDaysInMonth
      - (presentDays + lateDays + halfDays + onLeaveDays + holidayDays + weekendDays);

    return {
      employee,
      month,
      totalDaysInMonth,
      summaries,
      totalWorkedMinutes,
      totalOvertimeMinutes,
      presentDays,
      absentDays,
      lateDays,
      halfDays,
      onLeaveDays,
      holidayDays,
      weekendDays,
    };
  }

  // ─── Organization Monthly Report ───────

  async getOrganizationMonthlyReport(organizationId: string, month: string) {
    this.validateMonthFormat(month);

    const { start, end, totalDaysInMonth } = this.parseMonth(month);

    // Aggregate at DB level: counts per employee per status
    const statusGroups = await this.prisma.attendanceDailySummary.groupBy({
      by: ['employeeId', 'status'],
      where: {
        organizationId,
        date: { gte: start, lte: end },
      },
      _count: { status: true },
    });

    // Aggregate at DB level: worked + overtime minutes per employee
    const minuteGroups = await this.prisma.attendanceDailySummary.groupBy({
      by: ['employeeId'],
      where: {
        organizationId,
        date: { gte: start, lte: end },
      },
      _sum: {
        totalWorkedMinutes: true,
        overtimeMinutes: true,
      },
    });

    // Collect unique employee IDs
    const employeeIds = new Set<string>();
    for (const row of statusGroups) employeeIds.add(row.employeeId);
    for (const row of minuteGroups) employeeIds.add(row.employeeId);

    // Fetch employee info in one query
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: Array.from(employeeIds) } },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    });
    const employeeById = new Map<string, EmployeeBasicInfo>(
      employees.map((e: EmployeeBasicInfo) => [e.id, e]),
    );

    // Build per-employee map from status counts, tracking totals in one pass
    const trackedDaysMap = new Map<string, number>();
    const entryMap = new Map<string, EmployeeMonthlyEntry>();

    const getEntry = (empId: string): EmployeeMonthlyEntry => {
      let entry = entryMap.get(empId);
      if (!entry) {
        entry = {
          employee: employeeById.get(empId) ?? { id: empId, employeeCode: '', firstName: '', lastName: '' },
          totalWorkedMinutes: 0,
          totalOvertimeMinutes: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          halfDays: 0,
          onLeaveDays: 0,
          holidayDays: 0,
          weekendDays: 0,
        };
        entryMap.set(empId, entry);
      }
      return entry;
    };

    for (const row of statusGroups) {
      const entry = getEntry(row.employeeId);
      const c = row._count.status;
      trackedDaysMap.set(row.employeeId, (trackedDaysMap.get(row.employeeId) ?? 0) + c);
      switch (row.status) {
        case AttendanceStatus.PRESENT:  entry.presentDays = c;  break;
        case AttendanceStatus.LATE:     entry.lateDays = c;     break;
        case AttendanceStatus.HALF_DAY: entry.halfDays = c;     break;
        case AttendanceStatus.ON_LEAVE: entry.onLeaveDays = c;  break;
        case AttendanceStatus.HOLIDAY:  entry.holidayDays = c;  break;
        case AttendanceStatus.WEEKEND:  entry.weekendDays = c;  break;
      }
    }

    for (const row of minuteGroups) {
      const entry = getEntry(row.employeeId);
      entry.totalWorkedMinutes = row._sum.totalWorkedMinutes ?? 0;
      entry.totalOvertimeMinutes = row._sum.overtimeMinutes ?? 0;
    }

    // Compute absent days from pre-accumulated tracked counts
    for (const [empId, entry] of entryMap) {
      entry.absentDays = totalDaysInMonth - (trackedDaysMap.get(empId) ?? 0);
    }

    return {
      month,
      totalDaysInMonth,
      employees: Array.from(entryMap.values()),
    };
  }

  // ─── Monthly Excel Grid ────────────────
  //
  // Returns a matrix view: for each active employee, the list of daily
  // summaries within the month plus a simple "earned salary" projection
  // based on present + half-day proportion of total non-weekend days.

  async getMonthlyGrid(organizationId: string, month: string) {
    this.validateMonthFormat(month);
    const { start, end, totalDaysInMonth } = this.parseMonth(month);

    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
      },
      orderBy: [{ employeeCode: 'asc' }],
    });

    const employeeIds = employees.map((e) => e.id);

    const [summaries, logs, structures] = await Promise.all([
      this.prisma.attendanceDailySummary.findMany({
        where: {
          organizationId,
          employeeId: { in: employeeIds },
          date: { gte: start, lte: end },
        },
        select: {
          employeeId: true,
          date: true,
          status: true,
          firstCheckIn: true,
          lastCheckOut: true,
          totalWorkedMinutes: true,
          overtimeMinutes: true,
          lateMinutes: true,
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.attendanceLog.findMany({
        where: {
          organizationId,
          employeeId: { in: employeeIds },
          timestamp: { gte: start, lte: new Date(end.getTime() + 86400000) },
        },
        select: {
          employeeId: true,
          logType: true,
          timestamp: true,
        },
        orderBy: { timestamp: 'asc' },
      }),
      this.prisma.employeeSalaryStructure.findMany({
        where: {
          organizationId,
          employeeId: { in: employeeIds },
          isActive: true,
        },
        orderBy: { effectiveFrom: 'desc' },
        select: {
          employeeId: true,
          effectiveFrom: true,
          grossSalary: true,
        },
      }),
    ]);

    // Most recent active structure per employee
    const structureByEmp = new Map<string, { grossSalary: any }>();
    for (const s of structures) {
      if (!structureByEmp.has(s.employeeId)) {
        structureByEmp.set(s.employeeId, { grossSalary: s.grossSalary });
      }
    }

    // Group summaries and logs by employee
    const summariesByEmp = new Map<string, typeof summaries>();
    for (const s of summaries) {
      const arr = summariesByEmp.get(s.employeeId) ?? [];
      arr.push(s);
      summariesByEmp.set(s.employeeId, arr);
    }
    const logsByEmp = new Map<string, typeof logs>();
    for (const l of logs) {
      const arr = logsByEmp.get(l.employeeId) ?? [];
      arr.push(l);
      logsByEmp.set(l.employeeId, arr);
    }

    // Build a list of all dates in the month for the grid header
    const dates: string[] = [];
    for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) {
      dates.push(d.toISOString().slice(0, 10));
    }

    // Per-employee row payload
    const rows = employees.map((emp) => {
      const empSummaries = summariesByEmp.get(emp.id) ?? [];

      // index by date key
      const byDate = new Map<string, (typeof empSummaries)[number]>();
      for (const s of empSummaries) {
        byDate.set(s.date.toISOString().slice(0, 10), s);
      }

      const cells = dates.map((date) => {
        const s = byDate.get(date) ?? null;
        return {
          date,
          status: s?.status ?? null,
          checkIn: s?.firstCheckIn ?? null,
          checkOut: s?.lastCheckOut ?? null,
          workedMinutes: s?.totalWorkedMinutes ?? 0,
          lateMinutes: s?.lateMinutes ?? 0,
          overtimeMinutes: s?.overtimeMinutes ?? 0,
        };
      });

      // Effective working days (PRESENT + LATE + HALF_DAY * 0.5)
      let workingDayCount = 0;
      let effectiveWorked = 0;
      for (const s of empSummaries) {
        if (s.status === AttendanceStatus.PRESENT) {
          workingDayCount++;
          effectiveWorked++;
        } else if (s.status === AttendanceStatus.LATE) {
          workingDayCount++;
          effectiveWorked++;
        } else if (s.status === AttendanceStatus.HALF_DAY) {
          workingDayCount++;
          effectiveWorked += 0.5;
        } else if (s.status === AttendanceStatus.ON_LEAVE) {
          workingDayCount++;
        } else if (s.status === AttendanceStatus.ABSENT) {
          workingDayCount++;
        }
      }

      const grossSalary = structureByEmp.get(emp.id)?.grossSalary ?? null;
      const grossNum = grossSalary ? Number(grossSalary.toString()) : null;
      const earnedSalary =
        grossNum !== null && workingDayCount > 0
          ? Number(((grossNum / workingDayCount) * effectiveWorked).toFixed(2))
          : null;

      return {
        employee: emp,
        grossSalary: grossNum,
        workingDayCount,
        effectiveWorkedDays: effectiveWorked,
        earnedSalary,
        cells,
      };
    });

    return {
      month,
      totalDaysInMonth,
      dates,
      rows,
    };
  }

  // ─── Helpers ─────────────────────────────

  private startOfDayUTC(date: Date): Date {
    return new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ));
  }

  validateMonthFormat(month: string): void {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('month must be in YYYY-MM format');
    }
    const [year, mon] = month.split('-').map(Number);
    if (mon < 1 || mon > 12 || year < 2000 || year > 2100) {
      throw new BadRequestException('month contains an invalid year or month value');
    }
  }

  private parseMonth(month: string): { start: Date; end: Date; totalDaysInMonth: number } {
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, mon - 1, 1));
    const end = new Date(Date.UTC(year, mon, 0)); // last day of month
    const totalDaysInMonth = end.getUTCDate();
    return { start, end, totalDaysInMonth };
  }
}
