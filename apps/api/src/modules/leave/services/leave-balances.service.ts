import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { AdjustBalanceDto } from '../dto/adjust-balance.dto';

@Injectable()
export class LeaveBalancesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Employee's own balances ──────────

  async getMyBalances(userId: string, organizationId: string, year: number) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    return this.prisma.employeeLeaveBalance.findMany({
      where: { employeeId: employee.id, organizationId, year },
      include: {
        leavePolicy: {
          select: { id: true, name: true, code: true, isPaid: true },
        },
      },
      orderBy: { leavePolicy: { name: 'asc' } },
    });
  }

  // ─── Admin: get balances for an employee ──

  async getEmployeeBalances(
    organizationId: string,
    employeeId: string,
    year: number,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found in this organization');
    }

    const balances = await this.prisma.employeeLeaveBalance.findMany({
      where: { employeeId, organizationId, year },
      include: {
        leavePolicy: {
          select: { id: true, name: true, code: true, isPaid: true },
        },
      },
      orderBy: { leavePolicy: { name: 'asc' } },
    });

    return { employee, year, balances };
  }

  // ─── Admin: adjust balance ────────────

  async adjustBalance(organizationId: string, dto: AdjustBalanceDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, organizationId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found in this organization');
    }

    const policy = await this.prisma.leavePolicy.findFirst({
      where: { id: dto.leavePolicyId, organizationId },
    });
    if (!policy) {
      throw new NotFoundException('Leave policy not found in this organization');
    }

    const existing = await this.prisma.employeeLeaveBalance.findUnique({
      where: {
        employeeId_leavePolicyId_year: {
          employeeId: dto.employeeId,
          leavePolicyId: dto.leavePolicyId,
          year: dto.year,
        },
      },
    });

    if (!existing) {
      throw new BadRequestException(
        'No balance record exists for this employee/policy/year. Initialize balances first.',
      );
    }

    const newAdjustments = new Decimal(existing.adjustments.toString())
      .plus(new Decimal(dto.adjustment));
    const newBalance = new Decimal(existing.totalEntitled.toString())
      .plus(new Decimal(existing.carriedForward.toString()))
      .plus(newAdjustments)
      .minus(new Decimal(existing.used.toString()));

    return this.prisma.employeeLeaveBalance.update({
      where: { id: existing.id },
      data: {
        adjustments: newAdjustments,
        balance: newBalance,
      },
      include: {
        leavePolicy: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  // ─── Initialize balances for a year ───

  async initializeBalances(
    organizationId: string,
    employeeId: string,
    year: number,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found in this organization');
    }

    // Find all active policy assignments for this employee where the policy is also active
    const assignments = await this.prisma.employeeLeavePolicyAssignment.findMany({
      where: {
        employeeId,
        organizationId,
        effectiveFrom: { lte: new Date(Date.UTC(year, 11, 31)) },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date(Date.UTC(year, 0, 1)) } },
        ],
        leavePolicy: { isActive: true },
      },
      include: { leavePolicy: true },
    });

    const results = [];

    for (const assignment of assignments) {
      const entitled = assignment.customAnnualQuota
        ?? assignment.leavePolicy.annualQuotaDefault;

      // Carry forward from previous year
      let carriedForward = new Decimal(0);
      const prevBalance = await this.prisma.employeeLeaveBalance.findUnique({
        where: {
          employeeId_leavePolicyId_year: {
            employeeId,
            leavePolicyId: assignment.leavePolicyId,
            year: year - 1,
          },
        },
      });

      if (prevBalance) {
        const remaining = new Decimal(prevBalance.balance.toString());
        const limit = new Decimal(assignment.leavePolicy.carryForwardLimit.toString());
        carriedForward = remaining.greaterThan(0)
          ? Decimal.min(remaining, limit)
          : new Decimal(0);
      }

      const totalEntitled = new Decimal(entitled.toString());

      // Check if a balance record already exists for this employee/policy/year
      const existing = await this.prisma.employeeLeaveBalance.findUnique({
        where: {
          employeeId_leavePolicyId_year: {
            employeeId,
            leavePolicyId: assignment.leavePolicyId,
            year,
          },
        },
      });

      let record;

      if (existing) {
        // Re-initialization: update totalEntitled and carriedForward,
        // preserve used and adjustments, recompute balance
        const existingUsed = new Decimal(existing.used.toString());
        const existingAdjustments = new Decimal(existing.adjustments.toString());
        const newBalance = totalEntitled
          .plus(carriedForward)
          .plus(existingAdjustments)
          .minus(existingUsed);

        record = await this.prisma.employeeLeaveBalance.update({
          where: { id: existing.id },
          data: {
            totalEntitled,
            carriedForward,
            balance: newBalance,
          },
          include: {
            leavePolicy: {
              select: { id: true, name: true, code: true },
            },
          },
        });
      } else {
        // First-time initialization
        const balance = totalEntitled.plus(carriedForward);

        record = await this.prisma.employeeLeaveBalance.create({
          data: {
            organizationId,
            employeeId,
            leavePolicyId: assignment.leavePolicyId,
            year,
            totalEntitled,
            carriedForward,
            used: 0,
            adjustments: 0,
            balance,
          },
          include: {
            leavePolicy: {
              select: { id: true, name: true, code: true },
            },
          },
        });
      }

      results.push(record);
    }

    return results;
  }

  // ─── Internal: deduct/restore balance ──

  async deductBalance(
    employeeId: string,
    leavePolicyId: string,
    year: number,
    days: Decimal,
  ) {
    const balance = await this.prisma.employeeLeaveBalance.findUnique({
      where: {
        employeeId_leavePolicyId_year: { employeeId, leavePolicyId, year },
      },
    });

    if (!balance) {
      throw new BadRequestException('No balance record found for this leave type and year');
    }

    const currentBalance = new Decimal(balance.balance.toString());
    if (currentBalance.lessThan(days)) {
      throw new BadRequestException('Insufficient leave balance');
    }

    const newUsed = new Decimal(balance.used.toString()).plus(days);
    const newBalance = currentBalance.minus(days);

    return this.prisma.employeeLeaveBalance.update({
      where: { id: balance.id },
      data: { used: newUsed, balance: newBalance },
    });
  }

  async restoreBalance(
    employeeId: string,
    leavePolicyId: string,
    year: number,
    days: Decimal,
  ) {
    const balance = await this.prisma.employeeLeaveBalance.findUnique({
      where: {
        employeeId_leavePolicyId_year: { employeeId, leavePolicyId, year },
      },
    });

    if (!balance) return;

    const newUsed = Decimal.max(
      new Decimal(balance.used.toString()).minus(days),
      new Decimal(0),
    );
    const newBalance = new Decimal(balance.totalEntitled.toString())
      .plus(new Decimal(balance.carriedForward.toString()))
      .plus(new Decimal(balance.adjustments.toString()))
      .minus(newUsed);

    return this.prisma.employeeLeaveBalance.update({
      where: { id: balance.id },
      data: { used: newUsed, balance: newBalance },
    });
  }

  // ─── Helpers ──────────────────────────

  private async findEmployeeByUserId(userId: string, organizationId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId, organizationId, isActive: true },
    });
    if (!employee) {
      throw new NotFoundException(
        'No active employee profile linked to your user account',
      );
    }
    return employee;
  }
}
