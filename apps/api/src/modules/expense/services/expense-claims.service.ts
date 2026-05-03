import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateExpenseClaimDto } from '../dto/create-expense-claim.dto';
import { UpdateExpenseClaimDto } from '../dto/update-expense-claim.dto';
import { ReviewExpenseClaimDto } from '../dto/review-expense-claim.dto';
import { CancelExpenseClaimDto } from '../dto/cancel-expense-claim.dto';
import { NotificationEvents } from '../../notification/events/event-types';

const FINANCE_ROLE_SLUGS = ['finance_admin', 'super_admin'];

@Injectable()
export class ExpenseClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Employee creates a draft claim ─────

  async create(
    userId: string,
    organizationId: string,
    dto: CreateExpenseClaimDto,
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    // Validate policy if provided
    if (dto.expensePolicyId) {
      const policy = await this.prisma.expensePolicy.findFirst({
        where: { id: dto.expensePolicyId, organizationId, isActive: true },
      });
      if (!policy) {
        throw new NotFoundException('Expense policy not found or inactive');
      }
    }

    // Validate categories exist
    await this.validateCategories(organizationId, dto.items.map((i) => i.expenseCategoryId));

    const totalAmount = dto.items.reduce(
      (sum, item) => sum.add(new Prisma.Decimal(item.amount)),
      new Prisma.Decimal(0),
    );

    // Wrap in transaction with retry for claim number collision (P2002)
    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const claimNumber = await this.generateClaimNumber(organizationId, tx);

          return tx.expenseClaim.create({
            data: {
              organizationId,
              employeeId: employee.id,
              expensePolicyId: dto.expensePolicyId ?? null,
              claimNumber,
              title: dto.title,
              description: dto.description ?? null,
              totalAmount,
              status: 'DRAFT',
              items: {
                create: dto.items.map((item) => ({
                  expenseCategoryId: item.expenseCategoryId,
                  description: item.description,
                  amount: new Prisma.Decimal(item.amount),
                  expenseDate: new Date(item.expenseDate),
                  receiptUrl: item.receiptUrl ?? null,
                  receiptFileName: item.receiptFileName ?? null,
                  notes: item.notes ?? null,
                })),
              },
            },
            include: {
              items: { include: { expenseCategory: { select: { id: true, name: true, code: true } } } },
              expensePolicy: { select: { id: true, name: true } },
            },
          });
        });
      } catch (error) {
        // Retry on unique constraint violation (claim number race condition)
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < MAX_RETRIES - 1
        ) {
          continue;
        }
        throw error;
      }
    }

    // Unreachable, but satisfies TypeScript
    throw new BadRequestException('Failed to generate unique claim number');
  }

  // ─── Employee updates draft claim ───────

  async update(
    userId: string,
    organizationId: string,
    claimId: string,
    dto: UpdateExpenseClaimDto,
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const claim = await this.prisma.expenseClaim.findFirst({
      where: { id: claimId, employeeId: employee.id, organizationId },
    });
    if (!claim) throw new NotFoundException('Expense claim not found');

    if (claim.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT claims can be edited');
    }

    // Validate policy if changing
    if (dto.expensePolicyId !== undefined) {
      if (dto.expensePolicyId) {
        const policy = await this.prisma.expensePolicy.findFirst({
          where: { id: dto.expensePolicyId, organizationId, isActive: true },
        });
        if (!policy) {
          throw new NotFoundException('Expense policy not found or inactive');
        }
      }
    }

    // If items provided, replace all items
    if (dto.items && dto.items.length > 0) {
      await this.validateCategories(organizationId, dto.items.map((i) => i.expenseCategoryId));

      const totalAmount = dto.items.reduce(
        (sum, item) => sum.add(new Prisma.Decimal(item.amount)),
        new Prisma.Decimal(0),
      );

      return this.prisma.$transaction(async (tx) => {
        // Delete existing items
        await tx.expenseItem.deleteMany({ where: { expenseClaimId: claimId } });

        // Update claim and create new items
        return tx.expenseClaim.update({
          where: { id: claimId },
          data: {
            ...(dto.title !== undefined && { title: dto.title }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.expensePolicyId !== undefined && { expensePolicyId: dto.expensePolicyId || null }),
            totalAmount,
            items: {
              create: dto.items!.map((item) => ({
                expenseCategoryId: item.expenseCategoryId,
                description: item.description,
                amount: new Prisma.Decimal(item.amount),
                expenseDate: new Date(item.expenseDate),
                receiptUrl: item.receiptUrl ?? null,
                receiptFileName: item.receiptFileName ?? null,
                notes: item.notes ?? null,
              })),
            },
          },
          include: {
            items: { include: { expenseCategory: { select: { id: true, name: true, code: true } } } },
            expensePolicy: { select: { id: true, name: true } },
          },
        });
      });
    }

    // Update header fields only
    return this.prisma.expenseClaim.update({
      where: { id: claimId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.expensePolicyId !== undefined && { expensePolicyId: dto.expensePolicyId || null }),
      },
      include: {
        items: { include: { expenseCategory: { select: { id: true, name: true, code: true } } } },
        expensePolicy: { select: { id: true, name: true } },
      },
    });
  }

  // ─── Employee submits draft claim ───────

  async submit(userId: string, organizationId: string, claimId: string) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const claim = await this.prisma.expenseClaim.findFirst({
      where: { id: claimId, employeeId: employee.id, organizationId },
      include: { items: true, expensePolicy: true },
    });
    if (!claim) throw new NotFoundException('Expense claim not found');

    if (claim.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT claims can be submitted');
    }

    if (claim.items.length === 0) {
      throw new BadRequestException('Cannot submit a claim with no items');
    }

    // Validate against policy if set
    if (claim.expensePolicy) {
      const policy = claim.expensePolicy;

      if (policy.maxClaimAmount && claim.totalAmount.gt(policy.maxClaimAmount)) {
        throw new BadRequestException(
          `Claim total ${claim.totalAmount} exceeds max allowed ${policy.maxClaimAmount}`,
        );
      }

      for (const item of claim.items) {
        if (policy.maxItemAmount && item.amount.gt(policy.maxItemAmount)) {
          throw new BadRequestException(
            `Item "${item.description}" amount ${item.amount} exceeds max allowed ${policy.maxItemAmount}`,
          );
        }

        if (policy.receiptRequiredAbove && item.amount.gt(policy.receiptRequiredAbove) && !item.receiptUrl) {
          throw new BadRequestException(
            `Item "${item.description}" exceeds ${policy.receiptRequiredAbove} and requires a receipt`,
          );
        }
      }
    }

    const updated = await this.prisma.expenseClaim.update({
      where: { id: claimId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: {
        items: { include: { expenseCategory: { select: { id: true, name: true, code: true } } } },
      },
    });

    // Notify: manager (if any) — if no manager, finance picks it up via pending queue
    const recipientEmployeeIds: string[] = [];
    if (employee.reportingManagerId) {
      recipientEmployeeIds.push(employee.reportingManagerId);
    }

    this.eventEmitter.emit(NotificationEvents.EXPENSE_SUBMITTED, {
      organizationId,
      actorUserId: userId,
      referenceId: claimId,
      referenceType: 'ExpenseClaim',
      recipientEmployeeIds,
      variables: {
        employeeName: `${employee.firstName} ${employee.lastName}`,
        claimNumber: claim.claimNumber,
        title: claim.title,
        totalAmount: claim.totalAmount.toString(),
      },
    });

    return updated;
  }

  // ─── Employee cancels claim ─────────────

  async cancel(
    userId: string,
    organizationId: string,
    claimId: string,
    dto: CancelExpenseClaimDto,
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const claim = await this.prisma.expenseClaim.findFirst({
      where: { id: claimId, employeeId: employee.id, organizationId },
    });
    if (!claim) throw new NotFoundException('Expense claim not found');

    const nonCancellable: string[] = ['REIMBURSED', 'CANCELLED', 'REJECTED'];
    if (nonCancellable.includes(claim.status)) {
      throw new BadRequestException(`Cannot cancel a ${claim.status} claim`);
    }

    const updated = await this.prisma.expenseClaim.update({
      where: { id: claimId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: dto.cancelReason ?? null,
      },
    });

    // Notify: manager (if any)
    const recipientEmployeeIds: string[] = [];
    if (employee.reportingManagerId) {
      recipientEmployeeIds.push(employee.reportingManagerId);
    }

    this.eventEmitter.emit(NotificationEvents.EXPENSE_CANCELLED, {
      organizationId,
      actorUserId: userId,
      referenceId: claimId,
      referenceType: 'ExpenseClaim',
      recipientEmployeeIds,
      variables: {
        employeeName: `${employee.firstName} ${employee.lastName}`,
        claimNumber: claim.claimNumber,
        title: claim.title,
      },
    });

    return updated;
  }

  // ─── Employee views own claims ──────────

  async findMyClaims(
    userId: string,
    organizationId: string,
    status?: string,
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    return this.prisma.expenseClaim.findMany({
      where: {
        employeeId: employee.id,
        organizationId,
        ...(status && { status: status as any }),
      },
      include: {
        expensePolicy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyClaimById(
    userId: string,
    organizationId: string,
    claimId: string,
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const claim = await this.prisma.expenseClaim.findFirst({
      where: { id: claimId, employeeId: employee.id, organizationId },
      include: {
        items: { include: { expenseCategory: { select: { id: true, name: true, code: true } } } },
        expensePolicy: { select: { id: true, name: true } },
        approvalActions: {
          include: {
            approverEmployee: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!claim) throw new NotFoundException('Expense claim not found');
    return claim;
  }

  // ─── Approver reviews claim ─────────────

  async review(
    reviewerUserId: string,
    organizationId: string,
    claimId: string,
    dto: ReviewExpenseClaimDto,
    userRoles: string[],
  ) {
    const reviewer = await this.findEmployeeByUserId(reviewerUserId, organizationId);

    const claim = await this.prisma.expenseClaim.findFirst({
      where: { id: claimId, organizationId },
      include: {
        employee: { select: { id: true, reportingManagerId: true } },
        approvalActions: true,
      },
    });
    if (!claim) throw new NotFoundException('Expense claim not found');

    // Determine expected status for this reviewer
    const hasManager = !!claim.employee.reportingManagerId;
    const approverRole = this.resolveApproverRole(
      reviewer.id,
      claim.employee.reportingManagerId,
      userRoles,
    );

    // Validate claim is in the right state for this approver
    if (approverRole === 'MANAGER') {
      if (claim.status !== 'SUBMITTED') {
        throw new BadRequestException('Claim is not in SUBMITTED state for manager review');
      }
    } else if (approverRole === 'FINANCE') {
      if (hasManager && claim.status !== 'MANAGER_APPROVED') {
        throw new BadRequestException('Claim must be manager-approved before finance review');
      }
      if (!hasManager && claim.status !== 'SUBMITTED') {
        throw new BadRequestException('Claim is not in SUBMITTED state for finance review');
      }
    }

    // Prevent self-approval
    if (claim.employee.id === reviewer.id) {
      throw new ForbiddenException('You cannot approve your own expense claim');
    }

    // Prevent duplicate action by same employee
    const alreadyActed = claim.approvalActions.some(
      (a) => a.approverEmployeeId === reviewer.id,
    );
    if (alreadyActed) {
      throw new BadRequestException('You have already reviewed this claim');
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // Record the action
      await tx.expenseApprovalAction.create({
        data: {
          expenseClaimId: claimId,
          approverEmployeeId: reviewer.id,
          approverRole,
          action: dto.action,
          remarks: dto.remarks ?? null,
        },
      });

      if (dto.action === 'REJECTED') {
        await tx.expenseClaim.updateMany({
          where: { id: claimId, organizationId },
          data: {
            status: 'REJECTED',
            ...(approverRole === 'MANAGER' && { managerDecisionAt: now }),
            ...(approverRole === 'FINANCE' && { financeDecisionAt: now }),
            finalDecisionAt: now,
            finalDecisionById: reviewer.id,
          },
        });
        return tx.expenseClaim.findFirstOrThrow({
          where: { id: claimId, organizationId },
          include: this.claimDetailInclude(),
        });
      }

      // APPROVED action
      const updateData: any = {
        ...(approverRole === 'MANAGER' && { managerDecisionAt: now }),
        ...(approverRole === 'FINANCE' && { financeDecisionAt: now }),
      };

      if (approverRole === 'MANAGER') {
        updateData.status = 'MANAGER_APPROVED';
      } else if (approverRole === 'FINANCE') {
        updateData.status = 'FINANCE_APPROVED';
        updateData.finalDecisionAt = now;
        updateData.finalDecisionById = reviewer.id;
      }

      await tx.expenseClaim.updateMany({
        where: { id: claimId, organizationId },
        data: updateData,
      });
      return tx.expenseClaim.findFirstOrThrow({
        where: { id: claimId, organizationId },
        include: this.claimDetailInclude(),
      });
    });

    // Emit notification events based on final state
    const variables = {
      claimNumber: claim.claimNumber,
      title: claim.title,
      totalAmount: claim.totalAmount.toString(),
      remarks: dto.remarks ?? '',
    };

    if (result.status === 'REJECTED') {
      this.eventEmitter.emit(NotificationEvents.EXPENSE_REJECTED, {
        organizationId,
        actorUserId: reviewerUserId,
        referenceId: claimId,
        referenceType: 'ExpenseClaim',
        recipientEmployeeIds: [claim.employee.id],
        variables,
      });
    } else if (result.status === 'MANAGER_APPROVED') {
      // Notify the employee; finance picks it up via the pending queue
      this.eventEmitter.emit(NotificationEvents.EXPENSE_MANAGER_APPROVED, {
        organizationId,
        actorUserId: reviewerUserId,
        referenceId: claimId,
        referenceType: 'ExpenseClaim',
        recipientEmployeeIds: [claim.employee.id],
        variables,
      });
    } else if (result.status === 'FINANCE_APPROVED') {
      this.eventEmitter.emit(NotificationEvents.EXPENSE_FINANCE_APPROVED, {
        organizationId,
        actorUserId: reviewerUserId,
        referenceId: claimId,
        referenceType: 'ExpenseClaim',
        recipientEmployeeIds: [claim.employee.id],
        variables,
      });
    }

    return result;
  }

  // ─── Pending claims for approver ────────

  async findPendingForApprover(
    userId: string,
    organizationId: string,
    userRoles: string[],
  ) {
    const approver = await this.findEmployeeByUserId(userId, organizationId);

    const isManager = await this.prisma.employee.count({
      where: { reportingManagerId: approver.id, organizationId, isActive: true },
    }) > 0;

    const isFinance = userRoles.some((r) => FINANCE_ROLE_SLUGS.includes(r));

    if (!isManager && !isFinance) {
      return [];
    }

    const conditions: any[] = [];

    if (isManager) {
      // Direct reports with SUBMITTED status
      const directReportIds = await this.prisma.employee.findMany({
        where: { reportingManagerId: approver.id, organizationId, isActive: true },
        select: { id: true },
      });
      const reportIds = directReportIds.map((e) => e.id);

      if (reportIds.length > 0) {
        conditions.push({
          employeeId: { in: reportIds },
          status: 'SUBMITTED',
        });
      }
    }

    if (isFinance) {
      // MANAGER_APPROVED claims (normal flow) + SUBMITTED claims from manager-less employees
      conditions.push({ status: 'MANAGER_APPROVED' });
      conditions.push({
        status: 'SUBMITTED',
        employee: { reportingManagerId: null },
      });
    }

    if (conditions.length === 0) {
      return [];
    }

    return this.prisma.expenseClaim.findMany({
      where: {
        organizationId,
        // Exclude claims by the approver themselves
        employeeId: { not: approver.id },
        OR: conditions,
        // Exclude claims already acted on by this approver
        approvalActions: {
          none: { approverEmployeeId: approver.id },
        },
      },
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        expensePolicy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Admin: list all claims ─────────────

  async findAll(organizationId: string, status?: string) {
    return this.prisma.expenseClaim.findMany({
      where: {
        organizationId,
        ...(status && { status: status as any }),
      },
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        expensePolicy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Get single claim (owner, approver, finance, or HR) ─

  async findById(
    organizationId: string,
    claimId: string,
    callerUserId?: string,
    callerPermissions?: string[],
  ) {
    const claim = await this.prisma.expenseClaim.findFirst({
      where: { id: claimId, organizationId },
      include: this.claimDetailInclude(),
    });
    if (!claim) throw new NotFoundException('Expense claim not found');

    if (callerUserId && callerPermissions) {
      const isOwner = await this.isOwner(callerUserId, organizationId, claim.employeeId);
      const canReadAll =
        callerPermissions.includes('expense.read') ||
        callerPermissions.includes('expense.approve') ||
        callerPermissions.includes('expense.manage');
      if (!isOwner && !canReadAll) {
        throw new ForbiddenException('You do not have permission to view this expense claim');
      }
    }

    return claim;
  }

  private async isOwner(
    userId: string,
    organizationId: string,
    resourceEmployeeId: string,
  ): Promise<boolean> {
    const employee = await this.prisma.employee.findFirst({
      where: { userId, organizationId, isActive: true },
      select: { id: true },
    });
    return !!employee && employee.id === resourceEmployeeId;
  }

  // ─── Helpers ────────────────────────────

  private resolveApproverRole(
    reviewerId: string,
    reportingManagerId: string | null,
    userRoles: string[],
  ): 'MANAGER' | 'FINANCE' {
    const isDirectManager = reportingManagerId && reviewerId === reportingManagerId;
    const isFinance = userRoles.some((r) => FINANCE_ROLE_SLUGS.includes(r));

    if (isDirectManager) {
      return 'MANAGER';
    }
    if (isFinance) {
      return 'FINANCE';
    }

    throw new ForbiddenException(
      'You are not authorized to review this claim. Must be the direct manager or finance.',
    );
  }

  private async generateClaimNumber(
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client = tx ?? this.prisma;
    const year = new Date().getFullYear();
    const prefix = `EXP-${year}-`;

    // Find the highest existing sequence for this org+year
    const latest = await client.expenseClaim.findFirst({
      where: { organizationId, claimNumber: { startsWith: prefix } },
      orderBy: { claimNumber: 'desc' },
      select: { claimNumber: true },
    });

    let nextSeq = 1;
    if (latest) {
      const lastSeq = parseInt(latest.claimNumber.replace(prefix, ''), 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  private async validateCategories(organizationId: string, categoryIds: string[]) {
    const uniqueIds = [...new Set(categoryIds)];
    const found = await this.prisma.expenseCategory.count({
      where: { id: { in: uniqueIds }, organizationId, isActive: true },
    });
    if (found !== uniqueIds.length) {
      throw new BadRequestException('One or more expense categories not found or inactive');
    }
  }

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

  private claimDetailInclude() {
    return {
      employee: {
        select: { id: true, employeeCode: true, firstName: true, lastName: true, reportingManagerId: true },
      },
      items: {
        include: { expenseCategory: { select: { id: true, name: true, code: true } } },
        orderBy: { createdAt: 'asc' as const },
      },
      expensePolicy: { select: { id: true, name: true } },
      approvalActions: {
        include: {
          approverEmployee: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'asc' as const },
      },
      finalDecisionBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      reimbursedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    };
  }
}
