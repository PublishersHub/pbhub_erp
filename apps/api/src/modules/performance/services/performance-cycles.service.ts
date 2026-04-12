import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { PerformanceCycleStatus } from '@prisma/client';
import { CreateCycleDto } from '../dto/create-cycle.dto';
import { UpdateCycleDto } from '../dto/update-cycle.dto';
import { NotificationEvents } from '../../notification/events/event-types';

const VALID_TRANSITIONS: Record<PerformanceCycleStatus, PerformanceCycleStatus[]> = {
  DRAFT: ['GOAL_SETTING'],
  GOAL_SETTING: ['ACTIVE'],
  ACTIVE: ['SELF_REVIEW'],
  SELF_REVIEW: ['MANAGER_REVIEW'],
  MANAGER_REVIEW: ['CALIBRATION', 'CLOSED'],
  CALIBRATION: ['CLOSED'],
  CLOSED: [],
};

@Injectable()
export class PerformanceCyclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(organizationId: string, dto: CreateCycleDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }

    await this.validateNoOverlap(organizationId, startDate, endDate);

    return this.prisma.performanceCycle.create({
      data: {
        organizationId,
        name: dto.name,
        year: dto.year,
        quarter: dto.quarter,
        startDate,
        endDate,
        goalSettingDeadline: dto.goalSettingDeadline ? new Date(dto.goalSettingDeadline) : null,
        selfReviewDeadline: dto.selfReviewDeadline ? new Date(dto.selfReviewDeadline) : null,
        managerReviewDeadline: dto.managerReviewDeadline ? new Date(dto.managerReviewDeadline) : null,
        status: 'DRAFT',
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.performanceCycle.findMany({
      where: { organizationId },
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
    });
  }

  async findById(organizationId: string, id: string) {
    const cycle = await this.prisma.performanceCycle.findFirst({
      where: { id, organizationId },
    });
    if (!cycle) throw new NotFoundException('Performance cycle not found');
    return cycle;
  }

  async update(organizationId: string, id: string, dto: UpdateCycleDto) {
    const cycle = await this.findById(organizationId, id);

    if (cycle.status !== 'DRAFT' && cycle.status !== 'GOAL_SETTING') {
      throw new BadRequestException('Cycle can only be edited in DRAFT or GOAL_SETTING status');
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : cycle.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : cycle.endDate;

    if (endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }

    if (dto.startDate || dto.endDate) {
      await this.validateNoOverlap(organizationId, startDate, endDate, id);
    }

    return this.prisma.performanceCycle.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.year !== undefined && { year: dto.year }),
        ...(dto.quarter !== undefined && { quarter: dto.quarter }),
        ...(dto.startDate && { startDate }),
        ...(dto.endDate && { endDate }),
        ...(dto.goalSettingDeadline !== undefined && {
          goalSettingDeadline: dto.goalSettingDeadline ? new Date(dto.goalSettingDeadline) : null,
        }),
        ...(dto.selfReviewDeadline !== undefined && {
          selfReviewDeadline: dto.selfReviewDeadline ? new Date(dto.selfReviewDeadline) : null,
        }),
        ...(dto.managerReviewDeadline !== undefined && {
          managerReviewDeadline: dto.managerReviewDeadline ? new Date(dto.managerReviewDeadline) : null,
        }),
      },
    });
  }

  async transition(
    organizationId: string,
    id: string,
    targetStatus: PerformanceCycleStatus,
    actorUserId?: string,
  ) {
    const cycle = await this.findById(organizationId, id);

    const allowed = VALID_TRANSITIONS[cycle.status];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${cycle.status} to ${targetStatus}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // On transition to SELF_REVIEW: create review records
      if (targetStatus === 'SELF_REVIEW') {
        await this.createReviewRecords(tx, organizationId, id);
      }

      // On transition to CLOSED: finalize uncalibrated reviews
      if (targetStatus === 'CLOSED') {
        await this.finalizeReviews(tx, organizationId, id);
      }

      return tx.performanceCycle.update({
        where: { id },
        data: { status: targetStatus },
      });
    });

    // Notify all participants (employees with goals in this cycle)
    const participants = await this.prisma.goal.findMany({
      where: { cycleId: id, organizationId, isActive: true },
      select: { employeeId: true },
      distinct: ['employeeId'],
    });
    const recipientEmployeeIds = participants.map((p) => p.employeeId);

    this.eventEmitter.emit(NotificationEvents.PERFORMANCE_CYCLE_STATUS_CHANGED, {
      organizationId,
      actorUserId: actorUserId ?? null,
      referenceId: id,
      referenceType: 'PerformanceCycle',
      recipientEmployeeIds,
      variables: {
        cycleName: cycle.name,
        previousStatus: cycle.status,
        newStatus: targetStatus,
      },
    });

    return updated;
  }

  // ─── Internal ──────────────────────────

  private async createReviewRecords(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    organizationId: string,
    cycleId: string,
  ) {
    // Find employees with at least one APPROVED + active goal in this cycle
    const employeesWithGoals = await tx.goal.findMany({
      where: {
        cycleId,
        organizationId,
        status: 'APPROVED',
        isActive: true,
      },
      select: { employeeId: true },
      distinct: ['employeeId'],
    });

    const employeeIds = employeesWithGoals.map((g) => g.employeeId);
    if (employeeIds.length === 0) return;

    const employees = await tx.employee.findMany({
      where: { id: { in: employeeIds }, organizationId },
      select: { id: true, reportingManagerId: true },
    });

    for (const emp of employees) {
      // Skip if review already exists (idempotent)
      const existing = await tx.performanceReview.findUnique({
        where: { cycleId_employeeId: { cycleId, employeeId: emp.id } },
      });
      if (existing) continue;

      const review = await tx.performanceReview.create({
        data: {
          organizationId,
          cycleId,
          employeeId: emp.id,
          reviewerEmployeeId: emp.reportingManagerId,
          status: 'NOT_STARTED',
        },
      });

      // Create GoalReview entries for each approved active goal
      const goals = await tx.goal.findMany({
        where: {
          cycleId,
          employeeId: emp.id,
          status: 'APPROVED',
          isActive: true,
        },
        select: { id: true },
      });

      if (goals.length > 0) {
        await tx.goalReview.createMany({
          data: goals.map((g) => ({
            reviewId: review.id,
            goalId: g.id,
          })),
        });
      }
    }
  }

  private async finalizeReviews(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    organizationId: string,
    cycleId: string,
  ) {
    // Reviews submitted by manager but not calibrated: copy managerRating → finalRating
    const uncalibrated = await tx.performanceReview.findMany({
      where: {
        cycleId,
        organizationId,
        status: 'MANAGER_REVIEW_SUBMITTED',
        finalRating: null,
      },
    });

    for (const review of uncalibrated) {
      await tx.performanceReview.update({
        where: { id: review.id },
        data: {
          finalRating: review.managerRating,
          status: 'COMPLETED',
        },
      });
    }
  }

  private async validateNoOverlap(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ) {
    const overlap = await this.prisma.performanceCycle.findFirst({
      where: {
        organizationId,
        ...(excludeId && { id: { not: excludeId } }),
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    if (overlap) {
      throw new BadRequestException(
        `Cycle dates overlap with existing cycle "${overlap.name}" (${overlap.startDate.toISOString().slice(0, 10)} – ${overlap.endDate.toISOString().slice(0, 10)})`,
      );
    }
  }
}
