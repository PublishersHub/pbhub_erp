import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

const TASK_INCLUDE = {
  assignee: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      userId: true,
    },
  },
  assignedBy: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      userId: true,
    },
  },
} satisfies Prisma.TaskInclude;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ───────────────────────────────

  async create(
    creatorUserId: string,
    organizationId: string,
    dto: CreateTaskDto,
  ) {
    const creator = await this.findEmployeeByUserId(creatorUserId, organizationId);

    const assignee = await this.prisma.employee.findFirst({
      where: { id: dto.assigneeId, organizationId, isActive: true },
      select: { id: true },
    });
    if (!assignee) {
      throw new NotFoundException('Assignee not found in this organization');
    }

    return this.prisma.task.create({
      data: {
        organizationId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        assigneeId: dto.assigneeId,
        assignedById: creator.id,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        priority: dto.priority ?? 'MEDIUM',
        status: 'TODO',
      },
      include: TASK_INCLUDE,
    });
  }

  // ─── Read: my tasks (assignee=me) ────────

  async findMyTasks(
    userId: string,
    organizationId: string,
    filters: { status?: string; role?: string },
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);
    const role = filters.role === 'creator' ? 'creator' : 'assignee';

    const where: Prisma.TaskWhereInput = {
      organizationId,
      ...(role === 'creator'
        ? { assignedById: employee.id }
        : { assigneeId: employee.id }),
      ...(filters.status && this.isValidStatus(filters.status)
        ? { status: filters.status as TaskStatus }
        : {}),
    };

    return this.prisma.task.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  // ─── Read: org-wide ──────────────────────

  async findAll(
    organizationId: string,
    filters: { status?: string; assigneeId?: string },
  ) {
    return this.prisma.task.findMany({
      where: {
        organizationId,
        ...(filters.status && this.isValidStatus(filters.status)
          ? { status: filters.status as TaskStatus }
          : {}),
        ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
      },
      include: TASK_INCLUDE,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  // ─── Read: single ────────────────────────

  async findById(
    callerUserId: string,
    organizationId: string,
    taskId: string,
    callerPermissions: string[],
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId },
      include: TASK_INCLUDE,
    });
    if (!task) throw new NotFoundException('Task not found');

    await this.assertCanRead(task, callerUserId, organizationId, callerPermissions);
    return task;
  }

  // ─── Update ──────────────────────────────

  async update(
    callerUserId: string,
    organizationId: string,
    taskId: string,
    dto: UpdateTaskDto,
    callerPermissions: string[],
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId },
    });
    if (!task) throw new NotFoundException('Task not found');

    const employee = await this.findEmployeeByUserId(callerUserId, organizationId);

    const isAssignee = task.assigneeId === employee.id;
    const isCreator = task.assignedById === employee.id;
    const isAdmin =
      callerPermissions.includes('task.read') ||
      callerPermissions.includes('task.delete');

    if (!isAssignee && !isCreator && !isAdmin) {
      throw new ForbiddenException('You cannot update this task');
    }

    // Assignee (who is not the creator and not an admin) may only change status
    if (isAssignee && !isCreator && !isAdmin) {
      const allowed = ['status'];
      const attempted = Object.keys(dto).filter(
        (k) => (dto as any)[k] !== undefined,
      );
      const disallowed = attempted.filter((k) => !allowed.includes(k));
      if (disallowed.length > 0) {
        throw new ForbiddenException(
          'As the assignee you may only update the status of this task',
        );
      }
    }

    if (dto.assigneeId && dto.assigneeId !== task.assigneeId) {
      const assignee = await this.prisma.employee.findFirst({
        where: { id: dto.assigneeId, organizationId, isActive: true },
        select: { id: true },
      });
      if (!assignee) {
        throw new NotFoundException('Assignee not found in this organization');
      }
    }

    const data: Prisma.TaskUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined)
      data.description = dto.description?.trim() || null;
    if (dto.assigneeId !== undefined)
      data.assignee = { connect: { id: dto.assigneeId } };
    if (dto.dueDate !== undefined)
      data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'COMPLETED') {
        data.completedAt = task.completedAt ?? new Date();
      } else if (task.status === 'COMPLETED') {
        // Re-opening: clear completedAt
        data.completedAt = null;
      }
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data,
      include: TASK_INCLUDE,
    });
  }

  // ─── Mark complete ───────────────────────

  async markComplete(
    callerUserId: string,
    organizationId: string,
    taskId: string,
    callerPermissions: string[],
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId },
    });
    if (!task) throw new NotFoundException('Task not found');

    const employee = await this.findEmployeeByUserId(callerUserId, organizationId);
    const isAssignee = task.assigneeId === employee.id;
    const isCreator = task.assignedById === employee.id;
    const isAdmin =
      callerPermissions.includes('task.read') ||
      callerPermissions.includes('task.delete');

    if (!isAssignee && !isCreator && !isAdmin) {
      throw new ForbiddenException('You cannot complete this task');
    }

    if (task.status === 'COMPLETED') {
      throw new BadRequestException('Task is already completed');
    }
    if (task.status === 'CANCELLED') {
      throw new BadRequestException('Cancelled tasks cannot be completed');
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'COMPLETED', completedAt: new Date() },
      include: TASK_INCLUDE,
    });
  }

  // ─── Delete ──────────────────────────────

  async remove(organizationId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    await this.prisma.task.delete({ where: { id: taskId } });
    return { ok: true };
  }

  // ─── Helpers ─────────────────────────────

  private async assertCanRead(
    task: { assigneeId: string; assignedById: string },
    callerUserId: string,
    organizationId: string,
    callerPermissions: string[],
  ) {
    const canReadAll =
      callerPermissions.includes('task.read') ||
      callerPermissions.includes('task.delete');
    if (canReadAll) return;

    const employee = await this.findEmployeeByUserId(callerUserId, organizationId);
    if (task.assigneeId === employee.id || task.assignedById === employee.id) {
      return;
    }
    throw new ForbiddenException('You cannot view this task');
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

  private isValidStatus(value: string): boolean {
    return ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(value);
  }
}
