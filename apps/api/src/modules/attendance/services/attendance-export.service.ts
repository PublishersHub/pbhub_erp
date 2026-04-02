import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AttendanceReportsService } from './attendance-reports.service';

@Injectable()
export class AttendanceExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: AttendanceReportsService,
  ) {}

  // ─── Organization Monthly CSV ──────────

  async exportOrganizationMonthlyCsv(
    organizationId: string,
    month: string,
  ): Promise<string> {
    this.reportsService.validateMonthFormat(month);

    const report = await this.reportsService.getOrganizationMonthlyReport(
      organizationId,
      month,
    );

    const header = [
      'employeeCode',
      'firstName',
      'lastName',
      'totalWorkedMinutes',
      'totalOvertimeMinutes',
      'presentDays',
      'absentDays',
      'lateDays',
      'halfDays',
      'onLeaveDays',
      'holidayDays',
      'weekendDays',
    ].join(',');

    const rows = report.employees.map((e) =>
      [
        this.escapeCsv(e.employee.employeeCode),
        this.escapeCsv(e.employee.firstName),
        this.escapeCsv(e.employee.lastName),
        e.totalWorkedMinutes,
        e.totalOvertimeMinutes,
        e.presentDays,
        e.absentDays,
        e.lateDays,
        e.halfDays,
        e.onLeaveDays,
        e.holidayDays,
        e.weekendDays,
      ].join(','),
    );

    return '\uFEFF' + [header, ...rows].join('\n');
  }

  // ─── Employee Monthly CSV ─────────────

  async exportEmployeeMonthlyCsv(
    organizationId: string,
    employeeId: string,
    month: string,
  ): Promise<string> {
    this.reportsService.validateMonthFormat(month);

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found in this organization');
    }

    const report = await this.reportsService.getEmployeeMonthlyReport(
      organizationId,
      employeeId,
      month,
    );

    const header = [
      'date',
      'status',
      'firstCheckIn',
      'lastCheckOut',
      'totalWorkedMinutes',
      'overtimeMinutes',
      'lateMinutes',
      'earlyDepartureMinutes',
      'isIpCompliant',
    ].join(',');

    const rows = report.summaries.map((s) =>
      [
        this.escapeCsv(this.formatDate(s.date)),
        this.escapeCsv(s.status),
        this.escapeCsv(s.firstCheckIn ? this.formatDateTime(s.firstCheckIn) : ''),
        this.escapeCsv(s.lastCheckOut ? this.formatDateTime(s.lastCheckOut) : ''),
        s.totalWorkedMinutes,
        s.overtimeMinutes,
        s.lateMinutes,
        s.earlyDepartureMinutes,
        this.escapeCsv(s.isIpCompliant != null ? String(s.isIpCompliant) : ''),
      ].join(','),
    );

    return '\uFEFF' + [header, ...rows].join('\n');
  }

  // ─── Helpers ─────────────────────────────

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatDateTime(date: Date): string {
    return date.toISOString();
  }
}
