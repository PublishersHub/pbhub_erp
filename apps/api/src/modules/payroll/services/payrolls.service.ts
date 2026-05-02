import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AddPayrollAdjustmentDto } from '../dto/add-payroll-adjustment.dto';

@Injectable()
export class PayrollsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Employee self-service ──────────────

  async getMyPayslips(userId: string, organizationId: string, year?: number) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    return this.prisma.payroll.findMany({
      where: {
        employeeId: employee.id,
        organizationId,
        ...(year !== undefined && {
          payrollCycle: { year },
        }),
      },
      include: {
        payrollCycle: {
          select: { id: true, year: true, month: true, status: true, periodStart: true, periodEnd: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyPayslip(userId: string, organizationId: string, cycleId: string) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const payroll = await this.prisma.payroll.findFirst({
      where: {
        employeeId: employee.id,
        payrollCycleId: cycleId,
        organizationId,
      },
      include: {
        payrollCycle: {
          select: { id: true, year: true, month: true, status: true, periodStart: true, periodEnd: true },
        },
        lineItems: { orderBy: { sortOrder: 'asc' } },
        adjustments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!payroll) throw new NotFoundException('Payslip not found for this cycle');
    return payroll;
  }

  // ─── Admin views ────────────────────────

  async listPayrolls(organizationId: string, cycleId: string) {
    return this.prisma.payroll.findMany({
      where: { organizationId, payrollCycleId: cycleId },
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
      },
      orderBy: { employee: { firstName: 'asc' } },
    });
  }

  async getEmployeePayroll(
    organizationId: string,
    employeeId: string,
    cycleId: string,
  ) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { organizationId, employeeId, payrollCycleId: cycleId },
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        payrollCycle: {
          select: { id: true, year: true, month: true, status: true, periodStart: true, periodEnd: true },
        },
        lineItems: { orderBy: { sortOrder: 'asc' } },
        adjustments: {
          include: {
            addedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!payroll) throw new NotFoundException('Payroll record not found');
    return payroll;
  }

  // ─── Adjustments ────────────────────────

  async addAdjustment(
    organizationId: string,
    payrollId: string,
    dto: AddPayrollAdjustmentDto,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const payroll = await tx.payroll.findFirst({
        where: { id: payrollId, organizationId },
        include: { payrollCycle: { select: { status: true } } },
      });
      if (!payroll) throw new NotFoundException('Payroll not found');
      if (payroll.payrollCycle.status !== 'PROCESSED') {
        throw new BadRequestException(
          'Adjustments can only be added to PROCESSED payroll cycles',
        );
      }

      const employee = await this.findEmployeeByUserId(userId, organizationId);

      await tx.payrollAdjustment.create({
        data: {
          payrollId,
          type: dto.type,
          category: dto.category ?? 'OTHER',
          description: dto.description,
          amount: new Prisma.Decimal(dto.amount),
          addedById: employee.id,
        },
      });

      // Recalc totals
      return this.recalcPayrollTotals(tx, payrollId);
    });
  }

  async removeAdjustment(
    organizationId: string,
    adjustmentId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.payrollAdjustment.findFirst({
        where: { id: adjustmentId },
        include: {
          payroll: {
            select: { id: true, organizationId: true, payrollCycle: { select: { status: true } } },
          },
        },
      });
      if (!adjustment || adjustment.payroll.organizationId !== organizationId) {
        throw new NotFoundException('Adjustment not found');
      }
      if (adjustment.payroll.payrollCycle.status !== 'PROCESSED') {
        throw new BadRequestException(
          'Adjustments can only be removed from PROCESSED payroll cycles',
        );
      }

      await tx.payrollAdjustment.delete({ where: { id: adjustmentId } });

      return this.recalcPayrollTotals(tx, adjustment.payrollId);
    });
  }

  // ─── PDF / ownership ────────────────────

  /**
   * Lightweight ownership query used by the PDF endpoint to check
   * whether the requesting user owns this payslip (without pulling
   * all line-item data twice).
   */
  async findOwnership(
    organizationId: string,
    payrollId: string,
  ) {
    return this.prisma.payroll.findFirst({
      where: { id: payrollId, organizationId },
      select: {
        id: true,
        employee: { select: { userId: true } },
        payrollCycle: { select: { year: true, month: true } },
      },
    });
  }

  // ─── Helpers ────────────────────────────

  private async findEmployeeByUserId(userId: string, organizationId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId, organizationId },
    });
    if (!employee) {
      throw new NotFoundException('Employee record not found for this user');
    }
    return employee;
  }

  private async recalcPayrollTotals(
    tx: Prisma.TransactionClient,
    payrollId: string,
  ) {
    const adjustments = await tx.payrollAdjustment.findMany({
      where: { payrollId },
    });

    let totalAdjustments = new Prisma.Decimal(0);
    for (const adj of adjustments) {
      if (adj.type === 'EARNING') {
        totalAdjustments = totalAdjustments.add(adj.amount);
      } else {
        totalAdjustments = totalAdjustments.sub(adj.amount);
      }
    }

    const payroll = await tx.payroll.findUniqueOrThrow({
      where: { id: payrollId },
    });

    let netPayable = payroll.grossEarnings
      .sub(payroll.totalDeductions)
      .add(totalAdjustments);
    if (netPayable.lt(0)) netPayable = new Prisma.Decimal(0);

    return tx.payroll.update({
      where: { id: payrollId },
      data: { totalAdjustments, netPayable },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
        adjustments: { orderBy: { createdAt: 'asc' } },
      },
    });
  }
}
