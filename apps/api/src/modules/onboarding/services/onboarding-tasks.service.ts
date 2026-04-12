import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  OnboardingInstanceStatus,
  OnboardingTaskStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateTaskStatusDto } from '../dto/update-task-status.dto';
import { ReassignTaskDto } from '../dto/reassign-task.dto';
import { UploadTaskDocumentDto } from '../dto/upload-task-document.dto';
import { NotificationEvents } from '../../notification/events/event-types';

const HR_ROLE_SLUGS = ['hr_admin', 'super_admin'];

@Injectable()
export class OnboardingTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Queries ────────────────────────────

  async findMine(userId: string, organizationId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    });
    if (!employee) return [];

    const tasks = await this.prisma.onboardingTask.findMany({
      where: {
        assigneeEmployeeId: employee.id,
        onboardingInstance: {
          organizationId,
          status: {
            in: [
              OnboardingInstanceStatus.NOT_STARTED,
              OnboardingInstanceStatus.IN_PROGRESS,
            ],
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { sortOrder: 'asc' }],
      include: {
        onboardingInstance: {
          select: {
            id: true,
            templateName: true,
            joiningDate: true,
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
              },
            },
          },
        },
        documents: true,
      },
    });

    const now = Date.now();
    return tasks.map((t) => ({
      ...t,
      isOverdue:
        t.status !== OnboardingTaskStatus.COMPLETED &&
        t.dueDate.getTime() < now,
    }));
  }

  // ─── Status transitions ─────────────────

  async updateStatus(
    userId: string,
    organizationId: string,
    userRoles: string[],
    taskId: string,
    dto: UpdateTaskStatusDto,
  ) {
    const task = await this.prisma.onboardingTask.findFirst({
      where: {
        id: taskId,
        onboardingInstance: { organizationId },
      },
      include: {
        onboardingInstance: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    const instance = task.onboardingInstance;
    if (instance.status === OnboardingInstanceStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot update tasks on a cancelled instance',
      );
    }
    if (instance.status === OnboardingInstanceStatus.COMPLETED) {
      throw new BadRequestException(
        'Cannot update tasks on a completed instance',
      );
    }

    // Permission guard: only the assignee or HR override can update
    const isHrOverride = userRoles.some((r) => HR_ROLE_SLUGS.includes(r));
    if (!isHrOverride) {
      const actor = await this.prisma.employee.findFirst({
        where: { userId, organizationId, isActive: true },
        select: { id: true },
      });
      if (!actor || actor.id !== task.assigneeEmployeeId) {
        throw new ForbiddenException(
          'Only the assigned employee can update this task',
        );
      }
    }

    this.validateTransition(task.status, dto.status);

    if (
      dto.status === OnboardingTaskStatus.BLOCKED &&
      !dto.blockedReason?.trim()
    ) {
      throw new BadRequestException(
        'blockedReason is required when moving a task to BLOCKED',
      );
    }

    const now = new Date();
    const data: Prisma.OnboardingTaskUpdateInput = {
      status: dto.status,
      ...(dto.notes !== undefined && { notes: dto.notes }),
    };

    if (
      dto.status === OnboardingTaskStatus.IN_PROGRESS &&
      task.status === OnboardingTaskStatus.NOT_STARTED
    ) {
      data.startedAt = now;
    }
    if (dto.status === OnboardingTaskStatus.BLOCKED) {
      data.blockedReason = dto.blockedReason ?? null;
    }
    if (
      dto.status === OnboardingTaskStatus.IN_PROGRESS &&
      task.status === OnboardingTaskStatus.BLOCKED
    ) {
      data.blockedReason = null;
    }
    if (dto.status === OnboardingTaskStatus.COMPLETED) {
      data.completedAt = now;
      data.completedByUserId = userId;
      data.blockedReason = null;
      if (!task.startedAt) {
        data.startedAt = now;
      }
    }

    const {
      completed,
      instanceTransitionedToInProgress,
    } = await this.prisma.$transaction(async (tx) => {
      await tx.onboardingTask.update({
        where: { id: taskId },
        data,
      });

      let instanceTransitionedToInProgress = false;

      // Instance auto-transition to IN_PROGRESS on first task starting
      if (
        instance.status === OnboardingInstanceStatus.NOT_STARTED &&
        (dto.status === OnboardingTaskStatus.IN_PROGRESS ||
          dto.status === OnboardingTaskStatus.COMPLETED)
      ) {
        const updated = await tx.onboardingInstance.updateMany({
          where: {
            id: instance.id,
            status: OnboardingInstanceStatus.NOT_STARTED,
          },
          data: {
            status: OnboardingInstanceStatus.IN_PROGRESS,
            startedAt: now,
          },
        });
        if (updated.count > 0) instanceTransitionedToInProgress = true;
      }

      let completed = false;
      if (dto.status === OnboardingTaskStatus.COMPLETED) {
        // Auto-complete the instance when every required task is done
        const openRequired = await tx.onboardingTask.count({
          where: {
            onboardingInstanceId: instance.id,
            isRequired: true,
            status: { not: OnboardingTaskStatus.COMPLETED },
          },
        });
        if (openRequired === 0) {
          const res = await tx.onboardingInstance.updateMany({
            where: {
              id: instance.id,
              status: {
                in: [
                  OnboardingInstanceStatus.NOT_STARTED,
                  OnboardingInstanceStatus.IN_PROGRESS,
                ],
              },
            },
            data: {
              status: OnboardingInstanceStatus.COMPLETED,
              completedAt: now,
            },
          });
          if (res.count > 0) completed = true;
        }
      }

      return { completed, instanceTransitionedToInProgress };
    });

    // Post-transaction notifications
    const employeeName = `${instance.employee.firstName} ${instance.employee.lastName}`;

    if (dto.status === OnboardingTaskStatus.COMPLETED) {
      const completer = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      this.eventEmitter.emit(NotificationEvents.ONBOARDING_TASK_COMPLETED, {
        organizationId,
        actorUserId: userId,
        referenceId: taskId,
        referenceType: 'OnboardingTask',
        variables: {
          taskTitle: task.title,
          employeeName,
          completedBy: completer
            ? `${completer.firstName} ${completer.lastName}`
            : 'unknown',
        },
      });
    }

    if (completed) {
      this.eventEmitter.emit(NotificationEvents.ONBOARDING_COMPLETED, {
        organizationId,
        actorUserId: userId,
        referenceId: instance.id,
        referenceType: 'OnboardingInstance',
        variables: {
          employeeName,
        },
      });
    }

    // Suppress unused var warning for the flag
    void instanceTransitionedToInProgress;

    return this.prisma.onboardingTask.findUniqueOrThrow({
      where: { id: taskId },
      include: {
        assigneeEmployee: {
          select: { id: true, firstName: true, lastName: true },
        },
        documents: true,
      },
    });
  }

  private validateTransition(
    from: OnboardingTaskStatus,
    to: OnboardingTaskStatus,
  ) {
    if (from === to) {
      throw new BadRequestException(`Task is already ${from}`);
    }
    if (from === OnboardingTaskStatus.COMPLETED) {
      throw new BadRequestException('Completed tasks cannot be re-opened');
    }
    const allowed: Record<OnboardingTaskStatus, OnboardingTaskStatus[]> = {
      [OnboardingTaskStatus.NOT_STARTED]: [
        OnboardingTaskStatus.IN_PROGRESS,
        OnboardingTaskStatus.BLOCKED,
        OnboardingTaskStatus.COMPLETED,
      ],
      [OnboardingTaskStatus.IN_PROGRESS]: [
        OnboardingTaskStatus.BLOCKED,
        OnboardingTaskStatus.COMPLETED,
      ],
      [OnboardingTaskStatus.BLOCKED]: [
        OnboardingTaskStatus.IN_PROGRESS,
        OnboardingTaskStatus.COMPLETED,
      ],
      [OnboardingTaskStatus.COMPLETED]: [],
    };
    if (!allowed[from].includes(to)) {
      throw new BadRequestException(
        `Invalid status transition ${from} → ${to}`,
      );
    }
  }

  // ─── Reassign ───────────────────────────

  async reassign(
    organizationId: string,
    taskId: string,
    dto: ReassignTaskDto,
  ) {
    const task = await this.prisma.onboardingTask.findFirst({
      where: {
        id: taskId,
        onboardingInstance: { organizationId },
      },
      include: {
        onboardingInstance: { select: { status: true } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    if (task.status === OnboardingTaskStatus.COMPLETED) {
      throw new BadRequestException('Cannot reassign a completed task');
    }
    if (
      task.onboardingInstance.status === OnboardingInstanceStatus.CANCELLED ||
      task.onboardingInstance.status === OnboardingInstanceStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Cannot reassign tasks on a terminal instance',
      );
    }

    const assignee = await this.prisma.employee.findFirst({
      where: {
        id: dto.assigneeEmployeeId,
        organizationId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!assignee) {
      throw new NotFoundException('Assignee employee not found');
    }

    return this.prisma.onboardingTask.update({
      where: { id: taskId },
      data: { assigneeEmployeeId: assignee.id },
    });
  }

  // ─── Documents ──────────────────────────

  async addDocument(
    userId: string,
    organizationId: string,
    taskId: string,
    dto: UploadTaskDocumentDto,
  ) {
    const task = await this.prisma.onboardingTask.findFirst({
      where: {
        id: taskId,
        onboardingInstance: { organizationId },
      },
      include: {
        onboardingInstance: { select: { status: true } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    if (
      task.onboardingInstance.status === OnboardingInstanceStatus.CANCELLED ||
      task.onboardingInstance.status === OnboardingInstanceStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Cannot add documents to a terminal instance',
      );
    }

    if (!task.allowDocument) {
      throw new BadRequestException(
        'This task does not accept document uploads',
      );
    }

    return this.prisma.onboardingTaskDocument.create({
      data: {
        onboardingTaskId: taskId,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        uploadedByUserId: userId,
      },
    });
  }

  async listDocuments(organizationId: string, taskId: string) {
    const task = await this.prisma.onboardingTask.findFirst({
      where: {
        id: taskId,
        onboardingInstance: { organizationId },
      },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    return this.prisma.onboardingTaskDocument.findMany({
      where: { onboardingTaskId: taskId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeDocument(
    organizationId: string,
    taskId: string,
    documentId: string,
  ) {
    const document = await this.prisma.onboardingTaskDocument.findFirst({
      where: {
        id: documentId,
        onboardingTaskId: taskId,
        onboardingTask: {
          onboardingInstance: { organizationId },
        },
      },
    });
    if (!document) throw new NotFoundException('Document not found');

    return this.prisma.onboardingTaskDocument.delete({
      where: { id: documentId },
    });
  }
}
