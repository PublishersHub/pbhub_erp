import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateGoalDto } from '../dto/create-goal.dto';
import { UpdateGoalDto } from '../dto/update-goal.dto';
import { ApproveGoalDto } from '../dto/approve-goal.dto';
import { UpdateGoalProgressDto } from '../dto/update-goal-progress.dto';
import { NotificationEvents } from '../../notification/events/event-types';

const HR_ROLE_SLUGS = ['hr_admin', 'super_admin'];

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Create ────────────────────────────

  async create(userId: string, organizationId: string, dto: CreateGoalDto) {
    const creator = await this.findEmployeeByUserId(userId, organizationId);

    // Determine goal owner
    let employeeId = creator.id;
    if (dto.employeeId) {
      const target = await this.prisma.employee.findFirst({
        where: { id: dto.employeeId, organizationId, isActive: true },
      });
      if (!target) {
        throw new NotFoundException('Target employee not found');
      }
      if (target.reportingManagerId !== creator.id) {
        throw new ForbiddenException('You can only create goals for your direct reports');
      }
      employeeId = dto.employeeId;
    }

    // Validate cycle
    const cycle = await this.prisma.performanceCycle.findFirst({
      where: { id: dto.cycleId, organizationId },
    });
    if (!cycle) {
      throw new NotFoundException('Performance cycle not found');
    }
    if (cycle.status !== 'GOAL_SETTING') {
      throw new BadRequestException('Goals can only be created during the goal-setting phase');
    }

    return this.prisma.goal.create({
      data: {
        organizationId,
        cycleId: dto.cycleId,
        employeeId,
        createdByEmployeeId: creator.id,
        title: dto.title,
        description: dto.description ?? null,
        measurementType: dto.measurementType,
        targetValue: dto.targetValue ?? null,
        weight: dto.weight,
        status: 'DRAFT',
      },
      include: {
        cycle: { select: { id: true, name: true } },
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ─── My goals ──────────────────────────

  async findMyGoals(userId: string, organizationId: string, cycleId?: string) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    return this.prisma.goal.findMany({
      where: {
        employeeId: employee.id,
        organizationId,
        isActive: true,
        ...(cycleId && { cycleId }),
      },
      include: {
        cycle: { select: { id: true, name: true, year: true, quarter: true, status: true } },
        createdByEmployee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Team goals (manager) ─────────────

  async findTeamGoals(userId: string, organizationId: string, cycleId?: string) {
    const manager = await this.findEmployeeByUserId(userId, organizationId);

    const directReports = await this.prisma.employee.findMany({
      where: { reportingManagerId: manager.id, organizationId, isActive: true },
      select: { id: true },
    });

    return this.prisma.goal.findMany({
      where: {
        organizationId,
        employeeId: { in: directReports.map((e) => e.id) },
        isActive: true,
        ...(cycleId && { cycleId }),
      },
      include: {
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        cycle: { select: { id: true, name: true, year: true, quarter: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── All goals (admin) ────────────────

  async findAll(organizationId: string, cycleId?: string, employeeId?: string) {
    return this.prisma.goal.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(cycleId && { cycleId }),
        ...(employeeId && { employeeId }),
      },
      include: {
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        cycle: { select: { id: true, name: true, year: true, quarter: true } },
        createdByEmployee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Single goal ──────────────────────

  async findById(
    userId: string,
    organizationId: string,
    goalId: string,
    userRoles: string[],
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, organizationId, isActive: true },
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true, reportingManagerId: true },
        },
        cycle: { select: { id: true, name: true, year: true, quarter: true, status: true } },
        createdByEmployee: { select: { id: true, firstName: true, lastName: true } },
        approvedByEmployee: { select: { id: true, firstName: true, lastName: true } },
        progressUpdates: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!goal) throw new NotFoundException('Goal not found');

    const isOwner = goal.employeeId === employee.id;
    const isManager = goal.employee.reportingManagerId === employee.id;
    const isAdmin = userRoles.some((r) => HR_ROLE_SLUGS.includes(r));

    if (!isOwner && !isManager && !isAdmin) {
      throw new NotFoundException('Goal not found');
    }

    return goal;
  }

  // ─── Update (DRAFT / REJECTED only) ───

  async update(userId: string, organizationId: string, goalId: string, dto: UpdateGoalDto) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, organizationId, isActive: true },
      include: {
        employee: { select: { reportingManagerId: true } },
        cycle: { select: { status: true } },
      },
    });
    if (!goal) throw new NotFoundException('Goal not found');

    // Only owner or their manager can edit
    const isOwner = goal.employeeId === employee.id;
    const isManager = goal.employee.reportingManagerId === employee.id;
    if (!isOwner && !isManager) {
      throw new ForbiddenException('You can only edit your own goals or your direct reports\' goals');
    }

    if (goal.status !== 'DRAFT' && goal.status !== 'REJECTED') {
      throw new BadRequestException('Only DRAFT or REJECTED goals can be edited');
    }

    if (goal.cycle.status !== 'GOAL_SETTING') {
      throw new BadRequestException('Goals can only be edited during the goal-setting phase');
    }

    return this.prisma.goal.update({
      where: { id: goalId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.measurementType !== undefined && { measurementType: dto.measurementType }),
        ...(dto.targetValue !== undefined && { targetValue: dto.targetValue }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
        // Re-editing a rejected goal resets it to DRAFT
        ...(goal.status === 'REJECTED' && {
          status: 'DRAFT',
          rejectionReason: null,
          approvedByEmployeeId: null,
          approvedAt: null,
        }),
      },
    });
  }

  // ─── Submit (DRAFT → PENDING_APPROVAL) ─

  async submit(userId: string, organizationId: string, goalId: string) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, organizationId, isActive: true },
      include: {
        employee: { select: { reportingManagerId: true } },
        cycle: { select: { status: true } },
      },
    });
    if (!goal) throw new NotFoundException('Goal not found');

    const isOwner = goal.employeeId === employee.id;
    const isManager = goal.employee.reportingManagerId === employee.id;
    if (!isOwner && !isManager) {
      throw new ForbiddenException('You can only submit your own goals or your direct reports\' goals');
    }

    if (goal.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT goals can be submitted for approval');
    }

    if (goal.cycle.status !== 'GOAL_SETTING') {
      throw new BadRequestException('Goals can only be submitted during the goal-setting phase');
    }

    return this.prisma.goal.update({
      where: { id: goalId },
      data: { status: 'PENDING_APPROVAL' },
    });
  }

  // ─── Approve / Reject ─────────────────

  async approve(
    userId: string,
    organizationId: string,
    goalId: string,
    dto: ApproveGoalDto,
    userRoles: string[],
  ) {
    const reviewer = await this.findEmployeeByUserId(userId, organizationId);

    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, organizationId, isActive: true },
      include: {
        employee: { select: { id: true, reportingManagerId: true } },
        cycle: { select: { status: true } },
      },
    });
    if (!goal) throw new NotFoundException('Goal not found');

    if (goal.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only PENDING_APPROVAL goals can be approved or rejected');
    }

    if (goal.cycle.status !== 'GOAL_SETTING') {
      throw new BadRequestException('Goals can only be approved during the goal-setting phase');
    }

    // Authorization: reporting manager or HR
    const isManager = goal.employee.reportingManagerId === reviewer.id;
    const isHR = userRoles.some((r) => HR_ROLE_SLUGS.includes(r));
    if (!isManager && !isHR) {
      throw new ForbiddenException(
        'Only the reporting manager or HR can approve/reject goals',
      );
    }

    if (dto.action === 'REJECTED') {
      const rejected = await this.prisma.goal.update({
        where: { id: goalId },
        data: {
          status: 'REJECTED',
          approvedByEmployeeId: reviewer.id,
          approvedAt: new Date(),
          rejectionReason: dto.rejectionReason ?? null,
        },
      });

      this.eventEmitter.emit(NotificationEvents.PERFORMANCE_GOAL_REJECTED, {
        organizationId,
        actorUserId: userId,
        referenceId: goalId,
        referenceType: 'Goal',
        recipientEmployeeIds: [goal.employeeId],
        variables: {
          goalTitle: goal.title,
          rejectionReason: dto.rejectionReason ?? '',
        },
      });

      return rejected;
    }

    // APPROVED — validate weight sum won't exceed 100%
    const existingSum = await this.prisma.goal.aggregate({
      where: {
        cycleId: goal.cycleId,
        employeeId: goal.employeeId,
        organizationId,
        status: 'APPROVED',
        isActive: true,
        id: { not: goalId },
      },
      _sum: { weight: true },
    });

    const currentSum = new Decimal(existingSum._sum.weight?.toString() ?? '0');
    const newSum = currentSum.plus(new Decimal(goal.weight.toString()));

    if (newSum.greaterThan(new Decimal('100'))) {
      throw new BadRequestException(
        `Approving this goal would bring total weight to ${newSum}%, which exceeds 100%`,
      );
    }

    const approved = await this.prisma.goal.update({
      where: { id: goalId },
      data: {
        status: 'APPROVED',
        approvedByEmployeeId: reviewer.id,
        approvedAt: new Date(),
        rejectionReason: null,
      },
    });

    this.eventEmitter.emit(NotificationEvents.PERFORMANCE_GOAL_APPROVED, {
      organizationId,
      actorUserId: userId,
      referenceId: goalId,
      referenceType: 'Goal',
      recipientEmployeeIds: [goal.employeeId],
      variables: {
        goalTitle: goal.title,
      },
    });

    return approved;
  }

  // ─── Deactivate (soft delete) ─────────

  async deactivate(userId: string, organizationId: string, goalId: string) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, organizationId, isActive: true },
      include: { employee: { select: { reportingManagerId: true } } },
    });
    if (!goal) throw new NotFoundException('Goal not found');

    const isOwner = goal.employeeId === employee.id;
    const isManager = goal.employee.reportingManagerId === employee.id;
    if (!isOwner && !isManager) {
      throw new ForbiddenException('You can only deactivate your own goals or your direct reports\' goals');
    }

    if (goal.status !== 'DRAFT' && goal.status !== 'REJECTED') {
      throw new BadRequestException('Only DRAFT or REJECTED goals can be deactivated');
    }

    return this.prisma.goal.update({
      where: { id: goalId },
      data: { isActive: false },
    });
  }

  // ─── Progress updates ─────────────────

  async updateProgress(
    userId: string,
    organizationId: string,
    goalId: string,
    dto: UpdateGoalProgressDto,
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, organizationId, isActive: true },
      include: { cycle: { select: { status: true } } },
    });
    if (!goal) throw new NotFoundException('Goal not found');

    if (goal.employeeId !== employee.id) {
      throw new ForbiddenException('You can only update progress on your own goals');
    }

    if (goal.cycle.status !== 'ACTIVE') {
      throw new BadRequestException('Goal progress can only be updated during the active phase');
    }

    if (goal.status !== 'APPROVED') {
      throw new BadRequestException('Only approved goals can have progress updates');
    }

    if (dto.value === undefined && !dto.note) {
      throw new BadRequestException('At least one of value or note is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const progressUpdate = await tx.goalProgressUpdate.create({
        data: {
          goalId,
          updatedByEmployeeId: employee.id,
          value: dto.value ?? null,
          note: dto.note ?? null,
        },
      });

      if (dto.value !== undefined) {
        await tx.goal.update({
          where: { id: goalId },
          data: { currentValue: dto.value },
        });
      }

      return progressUpdate;
    });
  }

  async findGoalProgress(
    userId: string,
    organizationId: string,
    goalId: string,
    userRoles: string[],
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, organizationId, isActive: true },
      include: {
        employee: { select: { id: true, reportingManagerId: true } },
      },
    });
    if (!goal) throw new NotFoundException('Goal not found');

    const isOwner = goal.employeeId === employee.id;
    const isManager = goal.employee.reportingManagerId === employee.id;
    const isAdmin = userRoles.some((r) => HR_ROLE_SLUGS.includes(r));
    if (!isOwner && !isManager && !isAdmin) {
      throw new NotFoundException('Goal not found');
    }

    return this.prisma.goalProgressUpdate.findMany({
      where: { goalId },
      include: {
        updatedByEmployee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
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
