import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { LeaveDayType } from '@prisma/client';
import { LeaveBalancesService } from './leave-balances.service';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { ReviewLeaveRequestDto } from '../dto/review-leave-request.dto';
import { CancelLeaveRequestDto } from '../dto/cancel-leave-request.dto';
import { NotificationEvents } from '../../notification/events/event-types';

const HR_ROLE_SLUGS = ['hr_admin', 'super_admin'];

@Injectable()
export class LeaveRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balancesService: LeaveBalancesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Employee submits a leave request ──

  async create(
    userId: string,
    organizationId: string,
    dto: CreateLeaveRequestDto,
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('endDate cannot be before startDate');
    }

    // Reject cross-year requests
    if (startDate.getUTCFullYear() !== endDate.getUTCFullYear()) {
      throw new BadRequestException(
        'Cross-year leave requests are not supported. Please submit separate requests for each year.',
      );
    }

    // Validate policy exists and belongs to org
    const policy = await this.prisma.leavePolicy.findFirst({
      where: { id: dto.leavePolicyId, organizationId, isActive: true },
    });
    if (!policy) {
      throw new NotFoundException('Leave policy not found or inactive');
    }

    // Build day breakdown
    const dayEntries = this.buildDayEntries(startDate, endDate, dto, policy.allowHalfDay);

    // Calculate total days
    const totalDays = dayEntries.reduce(
      (sum, d) => sum.plus(d.days),
      new Decimal(0),
    );

    // Validate max consecutive days
    if (policy.maxConsecutiveDays) {
      const calendarDays = this.countCalendarDays(startDate, endDate);
      if (calendarDays > policy.maxConsecutiveDays) {
        throw new BadRequestException(
          `Maximum ${policy.maxConsecutiveDays} consecutive days allowed for this leave type`,
        );
      }
    }

    // Check overlapping pending/approved requests (org-scoped)
    const overlap = await this.prisma.leaveRequest.findFirst({
      where: {
        organizationId,
        employeeId: employee.id,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlap) {
      throw new BadRequestException(
        'You have an overlapping leave request for this period',
      );
    }

    // Check balance
    const year = startDate.getUTCFullYear();
    const balance = await this.prisma.employeeLeaveBalance.findUnique({
      where: {
        employeeId_leavePolicyId_year: {
          employeeId: employee.id,
          leavePolicyId: dto.leavePolicyId,
          year,
        },
      },
    });

    if (!balance) {
      throw new BadRequestException(
        'No leave balance found for this leave type. Contact HR to initialize balances.',
      );
    }

    const availableBalance = new Decimal(balance.balance.toString());
    if (availableBalance.lessThan(totalDays)) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${availableBalance}, Requested: ${totalDays}`,
      );
    }

    // Create the request with day breakdown
    const created = await this.prisma.leaveRequest.create({
      data: {
        organizationId,
        employeeId: employee.id,
        leavePolicyId: dto.leavePolicyId,
        startDate,
        endDate,
        totalDays,
        isHalfDay: dto.isHalfDay ?? false,
        reason: dto.reason ?? null,
        status: 'PENDING',
        days: {
          create: dayEntries.map((d) => ({
            date: d.date,
            dayType: d.dayType,
            days: d.days,
          })),
        },
      },
      include: {
        days: { orderBy: { date: 'asc' } },
        leavePolicy: { select: { id: true, name: true, code: true } },
      },
    });

    // Notify: manager (if any) + HR / super admin as fallback so the request
    // is never silently lost when no manager is assigned.
    const recipientEmployeeIds: string[] = [];
    if (employee.reportingManagerId) {
      recipientEmployeeIds.push(employee.reportingManagerId);
    }
    const hrUserIds = await this.findHrAndAdminUserIds(organizationId);

    this.eventEmitter.emit(NotificationEvents.LEAVE_SUBMITTED, {
      organizationId,
      actorUserId: userId,
      referenceId: created.id,
      referenceType: 'LeaveRequest',
      recipientEmployeeIds,
      recipientUserIds: hrUserIds,
      variables: {
        employeeName: `${employee.firstName} ${employee.lastName}`,
        leaveType: created.leavePolicy.name,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        totalDays: totalDays.toString(),
      },
    });

    return created;
  }

  // ─── Employee views own requests ──────

  async findMyRequests(
    userId: string,
    organizationId: string,
    status?: string,
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    return this.prisma.leaveRequest.findMany({
      where: {
        employeeId: employee.id,
        organizationId,
        ...(status && { status: status as any }),
      },
      include: {
        leavePolicy: { select: { id: true, name: true, code: true } },
        days: { orderBy: { date: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Employee cancels own request ─────

  async cancel(
    userId: string,
    organizationId: string,
    requestId: string,
    dto: CancelLeaveRequestDto,
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, employeeId: employee.id, organizationId },
    });
    if (!request) throw new NotFoundException('Leave request not found');

    if (request.status === 'CANCELLED') {
      throw new BadRequestException('This request is already cancelled');
    }
    if (request.status === 'REJECTED') {
      throw new BadRequestException('Cannot cancel a rejected request');
    }

    const wasApproved = request.status === 'APPROVED';

    const updated = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: dto.cancelReason ?? null,
      },
    });

    // Restore balance if it was previously approved
    if (wasApproved) {
      const year = request.startDate.getUTCFullYear();
      await this.balancesService.restoreBalance(
        employee.id,
        request.leavePolicyId,
        year,
        new Decimal(request.totalDays.toString()),
      );
    }

    // Notify: manager (if any)
    const recipientEmployeeIds: string[] = [];
    if (employee.reportingManagerId) {
      recipientEmployeeIds.push(employee.reportingManagerId);
    }

    this.eventEmitter.emit(NotificationEvents.LEAVE_CANCELLED, {
      organizationId,
      actorUserId: userId,
      referenceId: requestId,
      referenceType: 'LeaveRequest',
      recipientEmployeeIds,
      variables: {
        employeeName: `${employee.firstName} ${employee.lastName}`,
        startDate: request.startDate.toISOString().slice(0, 10),
        endDate: request.endDate.toISOString().slice(0, 10),
      },
    });

    return updated;
  }

  // ─── Admin: list all requests ─────────

  async findAll(organizationId: string, status?: string) {
    return this.prisma.leaveRequest.findMany({
      where: {
        organizationId,
        ...(status && { status: status as any }),
      },
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        leavePolicy: { select: { id: true, name: true, code: true } },
        days: { orderBy: { date: 'asc' } },
        approvalActions: {
          include: {
            approverEmployee: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Admin: get single request ────────

  async findById(
    organizationId: string,
    requestId: string,
    callerUserId?: string,
    callerPermissions?: string[],
  ) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, organizationId },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            reportingManagerId: true,
            userId: true,
          },
        },
        leavePolicy: { select: { id: true, name: true, code: true, requiresApproval: true } },
        days: { orderBy: { date: 'asc' } },
        approvalActions: {
          include: {
            approverEmployee: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        finalDecisionBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    if (!request) throw new NotFoundException('Leave request not found');

    if (callerUserId && callerPermissions) {
      const isOwner = request.employee?.userId === callerUserId;
      const canReadAll =
        callerPermissions.includes('leave.read') ||
        callerPermissions.includes('leave.approve') ||
        callerPermissions.includes('leave.manage');
      if (!isOwner && !canReadAll) {
        throw new ForbiddenException('You do not have permission to view this leave request');
      }
    }

    return request;
  }

  // ─── Approval: Manager or HR reviews ──

  async review(
    reviewerUserId: string,
    organizationId: string,
    requestId: string,
    dto: ReviewLeaveRequestDto,
    userRoles: string[],
  ) {
    const reviewer = await this.findEmployeeByUserId(reviewerUserId, organizationId);

    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, organizationId },
      include: {
        employee: { select: { id: true, reportingManagerId: true } },
        approvalActions: true,
        leavePolicy: { select: { requiresApproval: true } },
      },
    });
    if (!request) throw new NotFoundException('Leave request not found');

    if (request.status !== 'PENDING') {
      throw new BadRequestException('This request is no longer pending');
    }

    // Determine reviewer role explicitly
    const approverRole = this.resolveApproverRole(
      reviewer.id,
      request.employee.reportingManagerId,
      userRoles,
    );

    // Prevent same employee from acting twice on the same request
    const alreadyActedByEmployee = request.approvalActions.some(
      (a) => a.approverEmployeeId === reviewer.id,
    );
    if (alreadyActedByEmployee) {
      throw new BadRequestException('You have already reviewed this request');
    }

    // Check if this role has already acted
    const alreadyActedByRole = request.approvalActions.some(
      (a) => a.approverRole === approverRole,
    );
    if (alreadyActedByRole) {
      throw new BadRequestException(
        `${approverRole} has already reviewed this request`,
      );
    }

    // HR cannot act before manager
    if (approverRole === 'HR' && !request.approvalActions.some((a) => a.approverRole === 'MANAGER')) {
      throw new BadRequestException('Manager must review before HR');
    }

    // Wrap in transaction: create action + update request + deduct balance
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // Record the action
      await tx.leaveApprovalAction.create({
        data: {
          leaveRequestId: requestId,
          approverEmployeeId: reviewer.id,
          approverRole,
          action: dto.action,
          remarks: dto.remarks ?? null,
        },
      });

      if (dto.action === 'REJECTED') {
        // Any rejection → REJECTED immediately
        return tx.leaveRequest.update({
          where: { id: requestId },
          data: {
            status: 'REJECTED',
            ...(approverRole === 'MANAGER' && { managerDecisionAt: now }),
            ...(approverRole === 'HR' && { hrDecisionAt: now }),
            finalDecisionAt: now,
            finalDecisionById: reviewer.id,
          },
          include: {
            approvalActions: {
              include: {
                approverEmployee: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        });
      }

      // APPROVED action
      const updateData: any = {
        ...(approverRole === 'MANAGER' && { managerDecisionAt: now }),
        ...(approverRole === 'HR' && { hrDecisionAt: now }),
      };

      // Check if fully approved (both MANAGER and HR have approved)
      const managerApproved =
        approverRole === 'MANAGER' ||
        request.approvalActions.some(
          (a) => a.approverRole === 'MANAGER' && a.action === 'APPROVED',
        );
      const hrApproved =
        approverRole === 'HR' ||
        request.approvalActions.some(
          (a) => a.approverRole === 'HR' && a.action === 'APPROVED',
        );

      if (managerApproved && hrApproved) {
        updateData.status = 'APPROVED';
        updateData.finalDecisionAt = now;
        updateData.finalDecisionById = reviewer.id;

        // Deduct balance inside the transaction
        const year = request.startDate.getUTCFullYear();
        const totalDays = new Decimal(request.totalDays.toString());

        const balance = await tx.employeeLeaveBalance.findUnique({
          where: {
            employeeId_leavePolicyId_year: {
              employeeId: request.employeeId,
              leavePolicyId: request.leavePolicyId,
              year,
            },
          },
        });

        if (!balance) {
          throw new BadRequestException('No balance record found for this leave type and year');
        }

        const currentBalance = new Decimal(balance.balance.toString());
        if (currentBalance.lessThan(totalDays)) {
          throw new BadRequestException('Insufficient leave balance');
        }

        const newUsed = new Decimal(balance.used.toString()).plus(totalDays);
        const newBalance = currentBalance.minus(totalDays);

        await tx.employeeLeaveBalance.update({
          where: { id: balance.id },
          data: { used: newUsed, balance: newBalance },
        });
      }

      return tx.leaveRequest.update({
        where: { id: requestId },
        data: updateData,
        include: {
          approvalActions: {
            include: {
              approverEmployee: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    // Emit notification events based on final state
    if (result.status === 'REJECTED') {
      this.eventEmitter.emit(NotificationEvents.LEAVE_REJECTED, {
        organizationId,
        actorUserId: reviewerUserId,
        referenceId: requestId,
        referenceType: 'LeaveRequest',
        recipientEmployeeIds: [request.employeeId],
        variables: {
          startDate: request.startDate.toISOString().slice(0, 10),
          endDate: request.endDate.toISOString().slice(0, 10),
          remarks: dto.remarks ?? '',
        },
      });
    } else if (result.status === 'APPROVED') {
      this.eventEmitter.emit(NotificationEvents.LEAVE_APPROVED, {
        organizationId,
        actorUserId: reviewerUserId,
        referenceId: requestId,
        referenceType: 'LeaveRequest',
        recipientEmployeeIds: [request.employeeId],
        variables: {
          startDate: request.startDate.toISOString().slice(0, 10),
          endDate: request.endDate.toISOString().slice(0, 10),
          totalDays: request.totalDays.toString(),
        },
      });
    }

    return result;
  }

  // ─── Pending requests for approver ────

  async findPendingForApprover(
    userId: string,
    organizationId: string,
    userRoles: string[],
  ) {
    const approver = await this.findEmployeeByUserId(userId, organizationId);

    const isManager = await this.prisma.employee.count({
      where: { reportingManagerId: approver.id, organizationId, isActive: true },
    }) > 0;

    const isHR = userRoles.some((r) => HR_ROLE_SLUGS.includes(r));

    if (!isManager && !isHR) {
      return [];
    }

    // Filter out requests this approver has already acted on
    const alreadyActedFilter = {
      approvalActions: {
        none: { approverEmployeeId: approver.id },
      },
    };

    const conditions: any[] = [];

    if (isManager) {
      // Direct reports, pending, manager has not acted yet
      const directReportIds = await this.prisma.employee.findMany({
        where: { reportingManagerId: approver.id, organizationId, isActive: true },
        select: { id: true },
      });
      const reportIds = directReportIds.map((e) => e.id);

      if (reportIds.length > 0) {
        conditions.push({
          employeeId: { in: reportIds },
          managerDecisionAt: null,
        });
      }
    }

    if (isHR) {
      // Pending requests where manager has already decided, HR has not
      conditions.push({
        managerDecisionAt: { not: null },
        hrDecisionAt: null,
      });
    }

    if (conditions.length === 0) {
      return [];
    }

    return this.prisma.leaveRequest.findMany({
      where: {
        organizationId,
        status: 'PENDING',
        ...alreadyActedFilter,
        OR: conditions,
      },
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        leavePolicy: { select: { id: true, name: true, code: true } },
        days: { orderBy: { date: 'asc' } },
        approvalActions: {
          include: {
            approverEmployee: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Helpers ──────────────────────────

  private resolveApproverRole(
    reviewerId: string,
    reportingManagerId: string | null,
    userRoles: string[],
  ): 'MANAGER' | 'HR' {
    const isDirectManager = reportingManagerId && reviewerId === reportingManagerId;
    const isHR = userRoles.some((r) => HR_ROLE_SLUGS.includes(r));

    if (isDirectManager) {
      return 'MANAGER';
    }
    if (isHR) {
      return 'HR';
    }

    throw new ForbiddenException(
      'You are not authorized to review this request. Must be the direct manager or HR.',
    );
  }

  private buildDayEntries(
    startDate: Date,
    endDate: Date,
    dto: CreateLeaveRequestDto,
    allowHalfDay: boolean,
  ): { date: Date; dayType: LeaveDayType; days: Decimal }[] {
    // If explicit day breakdown provided, validate and use it
    if (dto.days && dto.days.length > 0) {
      const seenDates = new Set<string>();

      return dto.days.map((d) => {
        const dayDate = new Date(d.date);

        // Every day must fall within startDate..endDate
        if (dayDate < startDate || dayDate > endDate) {
          throw new BadRequestException(
            `Day ${d.date} is outside the leave request range ${dto.startDate} to ${dto.endDate}`,
          );
        }

        // No duplicate dates
        const dateKey = dayDate.toISOString().slice(0, 10);
        if (seenDates.has(dateKey)) {
          throw new BadRequestException(`Duplicate date in day breakdown: ${dateKey}`);
        }
        seenDates.add(dateKey);

        const dayType = d.dayType;
        if (
          !allowHalfDay &&
          (dayType === 'FIRST_HALF' || dayType === 'SECOND_HALF')
        ) {
          throw new BadRequestException(
            'Half-day leave is not allowed for this leave type',
          );
        }
        const days =
          dayType === 'FULL_DAY' ? new Decimal(1) : new Decimal(0.5);
        return { date: dayDate, dayType, days };
      });
    }

    // Auto-generate: all full days, or single half-day
    const entries: { date: Date; dayType: LeaveDayType; days: Decimal }[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const isHalfDay =
        dto.isHalfDay &&
        current.getTime() === startDate.getTime() &&
        startDate.getTime() === endDate.getTime();

      if (isHalfDay) {
        if (!allowHalfDay) {
          throw new BadRequestException(
            'Half-day leave is not allowed for this leave type',
          );
        }
        entries.push({
          date: new Date(current),
          dayType: 'FIRST_HALF',
          days: new Decimal(0.5),
        });
      } else {
        entries.push({
          date: new Date(current),
          dayType: 'FULL_DAY',
          days: new Decimal(1),
        });
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }

    return entries;
  }

  private countCalendarDays(start: Date, end: Date): number {
    const msPerDay = 86400000;
    return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
  }

  private async findHrAndAdminUserIds(organizationId: string): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        userRoles: {
          some: {
            role: { slug: { in: HR_ROLE_SLUGS } },
          },
        },
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
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
}
