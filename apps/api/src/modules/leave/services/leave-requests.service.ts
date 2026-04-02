import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { LeaveDayType } from '@prisma/client';
import { LeaveBalancesService } from './leave-balances.service';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { ReviewLeaveRequestDto } from '../dto/review-leave-request.dto';

@Injectable()
export class LeaveRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balancesService: LeaveBalancesService,
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

    // Check overlapping pending/approved requests
    const overlap = await this.prisma.leaveRequest.findFirst({
      where: {
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
    return this.prisma.leaveRequest.create({
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

  async cancel(userId: string, organizationId: string, requestId: string, cancelReason?: string) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, employeeId: employee.id },
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
        cancelReason: cancelReason ?? null,
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

  async findById(organizationId: string, requestId: string) {
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
    return request;
  }

  // ─── Approval: Manager or HR reviews ──

  async review(
    reviewerUserId: string,
    organizationId: string,
    requestId: string,
    dto: ReviewLeaveRequestDto,
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

    // Determine reviewer role
    const approverRole = this.determineApproverRole(
      reviewer.id,
      request.employee.reportingManagerId,
    );

    // Check if this role has already acted
    const alreadyActed = request.approvalActions.some(
      (a) => a.approverRole === approverRole,
    );
    if (alreadyActed) {
      throw new BadRequestException(
        `${approverRole} has already reviewed this request`,
      );
    }

    // For MANAGER approval, ensure manager acts first
    if (approverRole === 'HR' && !request.approvalActions.some((a) => a.approverRole === 'MANAGER')) {
      throw new BadRequestException('Manager must review before HR');
    }

    // Record the action
    await this.prisma.leaveApprovalAction.create({
      data: {
        leaveRequestId: requestId,
        approverEmployeeId: reviewer.id,
        approverRole,
        action: dto.action,
        remarks: dto.remarks ?? null,
      },
    });

    // Determine the new status
    const now = new Date();

    if (dto.action === 'REJECTED') {
      // Any rejection → REJECTED immediately
      const updated = await this.prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          ...(approverRole === 'MANAGER' && { managerDecisionAt: now }),
          ...(approverRole === 'HR' && { hrDecisionAt: now }),
          finalDecisionAt: now,
          finalDecisionById: reviewer.id,
        },
      });
      return updated;
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

      // Deduct balance
      const year = request.startDate.getUTCFullYear();
      await this.balancesService.deductBalance(
        request.employeeId,
        request.leavePolicyId,
        year,
        new Decimal(request.totalDays.toString()),
      );
    }

    const updated = await this.prisma.leaveRequest.update({
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

    return updated;
  }

  // ─── Pending requests for approver ────

  async findPendingForApprover(userId: string, organizationId: string) {
    const approver = await this.findEmployeeByUserId(userId, organizationId);

    // Find direct reports (manager role)
    const directReportIds = await this.prisma.employee.findMany({
      where: { reportingManagerId: approver.id, organizationId, isActive: true },
      select: { id: true },
    });
    const reportIds = directReportIds.map((e) => e.id);

    return this.prisma.leaveRequest.findMany({
      where: {
        organizationId,
        status: 'PENDING',
        OR: [
          // Requests from direct reports (manager role)
          { employeeId: { in: reportIds } },
          // All pending requests (HR role) — HR sees everything pending
        ],
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

  private buildDayEntries(
    startDate: Date,
    endDate: Date,
    dto: CreateLeaveRequestDto,
    allowHalfDay: boolean,
  ): { date: Date; dayType: LeaveDayType; days: Decimal }[] {
    // If explicit day breakdown provided, use it
    if (dto.days && dto.days.length > 0) {
      return dto.days.map((d) => {
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
        return { date: new Date(d.date), dayType, days };
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

  private determineApproverRole(
    reviewerId: string,
    reportingManagerId: string | null,
  ): 'MANAGER' | 'HR' {
    if (reportingManagerId && reviewerId === reportingManagerId) {
      return 'MANAGER';
    }
    return 'HR';
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
