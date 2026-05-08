import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SalaryStructuresService } from './salary-structures.service';

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri

@Injectable()
export class PayrollGenerationService {
  private readonly logger = new Logger(PayrollGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly salaryStructures: SalaryStructuresService,
  ) {}

  async generatePayroll(organizationId: string, cycleId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validate cycle is DRAFT, atomically set PROCESSING
      const cycle = await tx.payrollCycle.findFirst({
        where: { id: cycleId, organizationId },
      });
      if (!cycle) throw new BadRequestException('Payroll cycle not found');
      if (cycle.status !== 'DRAFT') {
        throw new BadRequestException(
          'Payroll can only be generated for DRAFT cycles',
        );
      }

      await tx.payrollCycle.update({
        where: { id: cycleId },
        data: { status: 'PROCESSING' },
      });

      const periodStart = cycle.periodStart;
      const periodEnd = cycle.periodEnd;
      const warnings: { employeeId: string; employeeCode: string; reason: string }[] = [];

      // 2. Get all eligible employees
      const employees = await this.getEligibleEmployees(tx, organizationId, periodStart);

      let totalGross = new Prisma.Decimal(0);
      let totalDeductions = new Prisma.Decimal(0);
      let totalNet = new Prisma.Decimal(0);
      let payrollCount = 0;

      // 3. Process each employee
      for (const emp of employees) {
        const result = await this.processEmployee(
          tx,
          organizationId,
          cycleId,
          emp,
          periodStart,
          periodEnd,
          warnings,
        );
        if (!result) continue;

        totalGross = totalGross.add(result.grossEarnings);
        totalDeductions = totalDeductions.add(result.totalDeductions);
        totalNet = totalNet.add(result.netPayable);
        payrollCount++;
      }

      // 4. Update cycle aggregates
      await tx.payrollCycle.update({
        where: { id: cycleId },
        data: {
          status: 'PROCESSED',
          totalGross,
          totalDeductions,
          totalNet,
          employeeCount: payrollCount,
          generatedAt: new Date(),
        },
      });

      return {
        cycleId,
        payrollCount,
        totalGross,
        totalDeductions,
        totalNet,
        warnings,
      };
    }, { timeout: 120000 }); // 2 min timeout for large payrolls
  }

  async regeneratePayroll(organizationId: string, cycleId: string) {
    // Validate cycle is PROCESSED
    const cycle = await this.prisma.payrollCycle.findFirst({
      where: { id: cycleId, organizationId },
    });
    if (!cycle) throw new BadRequestException('Payroll cycle not found');
    if (cycle.status !== 'PROCESSED') {
      throw new BadRequestException(
        'Only PROCESSED cycles can be re-generated',
      );
    }

    // Reset to DRAFT and delete existing payrolls (cascade deletes line items + adjustments)
    await this.prisma.$transaction([
      this.prisma.payroll.deleteMany({ where: { payrollCycleId: cycleId } }),
      this.prisma.payrollCycle.update({
        where: { id: cycleId },
        data: {
          status: 'DRAFT',
          totalGross: null,
          totalDeductions: null,
          totalNet: null,
          employeeCount: null,
          generatedAt: null,
        },
      }),
    ]);

    // Re-generate
    return this.generatePayroll(organizationId, cycleId);
  }

  // ─── Internal helpers ───────────────────

  private async getEligibleEmployees(
    tx: Prisma.TransactionClient,
    organizationId: string,
    periodStart: Date,
  ) {
    return tx.employee.findMany({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { employmentDetail: null },
          {
            employmentDetail: {
              employmentStatus: { notIn: ['RESIGNED', 'TERMINATED'] },
            },
          },
          {
            employmentDetail: {
              employmentStatus: { in: ['RESIGNED', 'TERMINATED'] },
              lastWorkingDate: { gte: periodStart },
            },
          },
        ],
      },
      include: {
        employmentDetail: true,
      },
    });
  }

  private async processEmployee(
    tx: Prisma.TransactionClient,
    organizationId: string,
    cycleId: string,
    employee: any,
    periodStart: Date,
    periodEnd: Date,
    warnings: { employeeId: string; employeeCode: string; reason: string }[],
  ) {
    // a. Get effective salary structure
    const structure = await this.salaryStructures.getEffectiveStructureForDate(
      employee.id,
      organizationId,
      periodStart,
    );
    if (!structure) {
      warnings.push({
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        reason: 'No active salary structure found for this period',
      });
      return null;
    }

    // b-c. Get working days from attendance policy + holidays
    const workingDaysOfWeek = await this.getEmployeeWorkingDays(
      tx,
      employee.id,
      periodStart,
    );
    const holidays = await this.getHolidays(tx, organizationId, periodStart, periodEnd);
    const holidayDates = new Set(
      holidays.map((h) => h.date.toISOString().split('T')[0]),
    );

    // d. Count total working days
    const allWorkingDates = this.getWorkingDatesInPeriod(
      periodStart,
      periodEnd,
      workingDaysOfWeek,
      holidayDates,
    );
    const holidayOnWorkingDays = this.countHolidaysOnWorkingDays(
      periodStart,
      periodEnd,
      workingDaysOfWeek,
      holidayDates,
    );

    // e. Prorate for mid-month join/exit
    const joiningDate = employee.employmentDetail?.joiningDate;
    const lastWorkingDate = employee.employmentDetail?.lastWorkingDate;
    const effectiveStart = joiningDate && joiningDate > periodStart ? joiningDate : periodStart;
    const effectiveEnd = lastWorkingDate && lastWorkingDate < periodEnd ? lastWorkingDate : periodEnd;

    const proratedWorkingDates = this.getWorkingDatesInPeriod(
      effectiveStart,
      effectiveEnd,
      workingDaysOfWeek,
      holidayDates,
    );
    const totalWorkingDays = new Prisma.Decimal(proratedWorkingDates.length);

    // f-g. Compute leave days
    const unpaidLeaveDays = await this.computeUnpaidLeave(
      tx,
      employee.id,
      organizationId,
      effectiveStart,
      effectiveEnd,
    );
    const paidLeaveDays = await this.computePaidLeave(
      tx,
      employee.id,
      organizationId,
      effectiveStart,
      effectiveEnd,
    );

    // h. Half-days from attendance (exclude leave days)
    const halfDays = await this.computeHalfDays(
      tx,
      employee.id,
      organizationId,
      effectiveStart,
      effectiveEnd,
    );

    const holidayDaysCount = new Prisma.Decimal(holidayOnWorkingDays);

    // i. Effective working days
    const effectiveWorkingDays = totalWorkingDays
      .sub(unpaidLeaveDays)
      .sub(new Prisma.Decimal(halfDays).mul(new Prisma.Decimal('0.5')));

    // j-k. Per-day rate and LOP
    const grossSalary = structure.grossSalary;
    const allWorkingDaysCount = new Prisma.Decimal(allWorkingDates.length || 1);
    const perDayRate = totalWorkingDays.gt(0)
      ? grossSalary.div(totalWorkingDays)
      : new Prisma.Decimal(0);
    const lossOfPayDays = totalWorkingDays.sub(effectiveWorkingDays);
    const lossOfPayDeduction = lossOfPayDays.gt(0)
      ? lossOfPayDays.mul(perDayRate)
      : new Prisma.Decimal(0);

    // l-m. Earnings and deductions from components
    let grossEarnings = new Prisma.Decimal(0);
    let compDeductions = new Prisma.Decimal(0);

    for (const comp of structure.components) {
      if (comp.salaryComponent.type === 'EARNING') {
        grossEarnings = grossEarnings.add(comp.amount);
      } else {
        compDeductions = compDeductions.add(comp.amount);
      }
    }

    // Prorate earnings/deductions if mid-month
    if (totalWorkingDays.lt(allWorkingDaysCount) && allWorkingDaysCount.gt(0)) {
      const ratio = totalWorkingDays.div(allWorkingDaysCount);
      grossEarnings = grossEarnings.mul(ratio);
      compDeductions = compDeductions.mul(ratio);
    }

    const totalDeductionsAmt = compDeductions.add(lossOfPayDeduction);

    // n. Net payable (clamp >= 0)
    let netPayable = grossEarnings.sub(totalDeductionsAmt);
    if (netPayable.lt(0)) netPayable = new Prisma.Decimal(0);

    // o. Create Payroll + LineItems
    const payroll = await tx.payroll.create({
      data: {
        organizationId,
        payrollCycleId: cycleId,
        employeeId: employee.id,
        totalWorkingDays,
        paidLeaveDays,
        unpaidLeaveDays,
        halfDays: new Prisma.Decimal(halfDays),
        holidayDays: holidayDaysCount,
        effectiveWorkingDays,
        baseSalary: grossSalary,
        grossEarnings,
        totalDeductions: totalDeductionsAmt,
        totalAdjustments: new Prisma.Decimal(0),
        lossOfPayDeduction,
        netPayable,
        lineItems: {
          create: structure.components.map((comp: any) => ({
            salaryComponentId: comp.salaryComponent.id,
            componentName: comp.salaryComponent.name,
            componentCode: comp.salaryComponent.code,
            type: comp.salaryComponent.type,
            amount: comp.amount,
            sortOrder: 0,
          })),
        },
      },
    });

    return {
      grossEarnings,
      totalDeductions: totalDeductionsAmt,
      netPayable,
    };
  }

  private async getEmployeeWorkingDays(
    tx: Prisma.TransactionClient,
    employeeId: string,
    periodStart: Date,
  ): Promise<number[]> {
    // Per-employee override wins over the assigned policy. The override's
    // workingDays defaults to [] which means "no override — fall back to policy".
    const override = await tx.employeeAttendanceOverride.findUnique({
      where: { employeeId },
      select: { workingDays: true },
    });
    if (override?.workingDays && override.workingDays.length > 0) {
      return override.workingDays;
    }

    const assignment = await tx.employeeAttendancePolicyAssignment.findFirst({
      where: {
        employeeId,
        effectiveFrom: { lte: periodStart },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: periodStart } },
        ],
      },
      include: { attendancePolicy: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    return assignment?.attendancePolicy?.workingDays ?? DEFAULT_WORKING_DAYS;
  }

  private async getHolidays(
    tx: Prisma.TransactionClient,
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    return tx.holiday.findMany({
      where: {
        organizationId,
        isActive: true,
        date: { gte: periodStart, lte: periodEnd },
      },
    });
  }

  private getWorkingDatesInPeriod(
    start: Date,
    end: Date,
    workingDaysOfWeek: number[],
    holidayDates: Set<string>,
  ): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getUTCDay(); // 0=Sun, 1=Mon...
      const dateStr = current.toISOString().split('T')[0];
      if (workingDaysOfWeek.includes(dayOfWeek) && !holidayDates.has(dateStr)) {
        dates.push(new Date(current));
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
  }

  private countHolidaysOnWorkingDays(
    start: Date,
    end: Date,
    workingDaysOfWeek: number[],
    holidayDates: Set<string>,
  ): number {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getUTCDay();
      const dateStr = current.toISOString().split('T')[0];
      if (workingDaysOfWeek.includes(dayOfWeek) && holidayDates.has(dateStr)) {
        count++;
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return count;
  }

  private async computeUnpaidLeave(
    tx: Prisma.TransactionClient,
    employeeId: string,
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Prisma.Decimal> {
    const result = await tx.leaveRequestDay.aggregate({
      _sum: { days: true },
      where: {
        date: { gte: periodStart, lte: periodEnd },
        leaveRequest: {
          employeeId,
          organizationId,
          status: 'APPROVED',
          leavePolicy: { isPaid: false },
        },
      },
    });
    return result._sum.days ?? new Prisma.Decimal(0);
  }

  private async computePaidLeave(
    tx: Prisma.TransactionClient,
    employeeId: string,
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Prisma.Decimal> {
    const result = await tx.leaveRequestDay.aggregate({
      _sum: { days: true },
      where: {
        date: { gte: periodStart, lte: periodEnd },
        leaveRequest: {
          employeeId,
          organizationId,
          status: 'APPROVED',
          leavePolicy: { isPaid: true },
        },
      },
    });
    return result._sum.days ?? new Prisma.Decimal(0);
  }

  private async computeHalfDays(
    tx: Prisma.TransactionClient,
    employeeId: string,
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    // Count attendance half-days, excluding days that already have leave
    const leaveDays = await tx.leaveRequestDay.findMany({
      where: {
        date: { gte: periodStart, lte: periodEnd },
        leaveRequest: {
          employeeId,
          organizationId,
          status: 'APPROVED',
        },
      },
      select: { date: true },
    });
    const leaveDateSet = new Set(
      leaveDays.map((d) => d.date.toISOString().split('T')[0]),
    );

    const halfDaySummaries = await tx.attendanceDailySummary.findMany({
      where: {
        employeeId,
        organizationId,
        date: { gte: periodStart, lte: periodEnd },
        status: 'HALF_DAY',
      },
      select: { date: true },
    });

    // Exclude half-days that overlap with leave days (edge case #9)
    return halfDaySummaries.filter(
      (s) => !leaveDateSet.has(s.date.toISOString().split('T')[0]),
    ).length;
  }
}
