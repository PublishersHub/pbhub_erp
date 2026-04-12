import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReimburseExpenseClaimDto } from '../dto/reimburse-expense-claim.dto';
import { NotificationEvents } from '../../notification/events/event-types';

@Injectable()
export class ExpenseReimbursementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async reimburse(
    userId: string,
    organizationId: string,
    claimId: string,
    dto: ReimburseExpenseClaimDto,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Validate claim
      const claim = await tx.expenseClaim.findFirst({
        where: { id: claimId, organizationId },
      });
      if (!claim) throw new NotFoundException('Expense claim not found');

      if (claim.status !== 'FINANCE_APPROVED') {
        throw new BadRequestException(
          'Only FINANCE_APPROVED claims can be reimbursed',
        );
      }

      if (claim.payrollAdjustmentId) {
        throw new BadRequestException('This claim has already been reimbursed');
      }

      // 2. Validate payroll
      const payroll = await tx.payroll.findFirst({
        where: { id: dto.payrollId, organizationId },
        include: { payrollCycle: { select: { status: true } } },
      });
      if (!payroll) throw new NotFoundException('Payroll record not found');

      if (payroll.employeeId !== claim.employeeId) {
        throw new BadRequestException(
          'Payroll record does not belong to the claim employee',
        );
      }

      if (payroll.payrollCycle.status !== 'PROCESSED') {
        throw new BadRequestException(
          'Payroll adjustments can only be added to PROCESSED payroll cycles',
        );
      }

      // 3. Resolve finance employee
      const financeEmployee = await this.findEmployeeByUserId(userId, organizationId);

      // 4. Create payroll adjustment
      const adjustment = await tx.payrollAdjustment.create({
        data: {
          payrollId: dto.payrollId,
          type: 'EARNING',
          category: 'REIMBURSEMENT',
          description: `Expense reimbursement: ${claim.claimNumber} - ${claim.title}`,
          amount: claim.totalAmount,
          addedById: financeEmployee.id,
        },
      });

      // 5. Update claim (defensive: scope by organizationId)
      const now = new Date();
      await tx.expenseClaim.updateMany({
        where: { id: claimId, organizationId },
        data: {
          status: 'REIMBURSED',
          reimbursedAt: now,
          reimbursedById: financeEmployee.id,
          payrollAdjustmentId: adjustment.id,
        },
      });

      // 6. Recalc payroll totals
      const updatedPayroll = await this.recalcPayrollTotals(tx, dto.payrollId);

      // 7. Return claim with payroll info
      return tx.expenseClaim.findUniqueOrThrow({
        where: { id: claimId },
        include: {
          employee: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
          reimbursedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          payrollAdjustment: true,
        },
      });
    });

    // Notify the claim owner
    this.eventEmitter.emit(NotificationEvents.EXPENSE_REIMBURSED, {
      organizationId,
      actorUserId: userId,
      referenceId: claimId,
      referenceType: 'ExpenseClaim',
      recipientEmployeeIds: [result.employee.id],
      variables: {
        claimNumber: result.claimNumber,
        title: result.title,
        totalAmount: result.totalAmount.toString(),
      },
    });

    return result;
  }

  // ─── Helpers (matching PayrollsService pattern) ──

  private async findEmployeeByUserId(userId: string, organizationId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId, organizationId, isActive: true },
    });
    if (!employee) {
      throw new NotFoundException('No active employee profile linked to your user account');
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
    });
  }
}
