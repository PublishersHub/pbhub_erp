import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OnboardingTaskAssigneeRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateOnboardingTemplateDto } from '../dto/create-onboarding-template.dto';
import { UpdateOnboardingTemplateDto } from '../dto/update-onboarding-template.dto';
import { CreateTemplateTaskDto } from '../dto/create-template-task.dto';
import { UpdateTemplateTaskDto } from '../dto/update-template-task.dto';
import { ReorderTemplateTasksDto } from '../dto/reorder-template-tasks.dto';

@Injectable()
export class OnboardingTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Template CRUD ──────────────────────

  async create(organizationId: string, dto: CreateOnboardingTemplateDto) {
    const nameConflict = await this.prisma.onboardingTemplate.findFirst({
      where: { organizationId, name: dto.name },
    });
    if (nameConflict) {
      throw new BadRequestException(
        `Template name "${dto.name}" is already in use in this organization`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.onboardingTemplate.updateMany({
          where: { organizationId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.onboardingTemplate.create({
        data: {
          organizationId,
          name: dto.name,
          description: dto.description ?? null,
          isDefault: dto.isDefault ?? false,
          isActive: dto.isActive ?? true,
        },
      });
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.onboardingTemplate.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { tasks: true, instances: true } },
      },
    });
  }

  async findById(organizationId: string, id: string) {
    const template = await this.prisma.onboardingTemplate.findFirst({
      where: { id, organizationId },
      include: {
        tasks: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { instances: true } },
      },
    });
    if (!template) {
      throw new NotFoundException(
        `Onboarding template ${id} not found in your organization`,
      );
    }
    return template;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateOnboardingTemplateDto,
  ) {
    const template = await this.prisma.onboardingTemplate.findFirst({
      where: { id, organizationId },
    });
    if (!template) {
      throw new NotFoundException(
        `Onboarding template ${id} not found in your organization`,
      );
    }

    if (dto.name && dto.name !== template.name) {
      const conflict = await this.prisma.onboardingTemplate.findFirst({
        where: {
          organizationId,
          name: dto.name,
          id: { not: id },
        },
      });
      if (conflict) {
        throw new BadRequestException(
          `Template name "${dto.name}" is already in use in this organization`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Setting this template as the default clears the flag on any siblings
      if (dto.isDefault === true && !template.isDefault) {
        await tx.onboardingTemplate.updateMany({
          where: {
            organizationId,
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }

      return tx.onboardingTemplate.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    });
  }

  // ─── Template Task CRUD ─────────────────

  async createTask(
    organizationId: string,
    templateId: string,
    dto: CreateTemplateTaskDto,
  ) {
    if (dto.assigneeRole === OnboardingTaskAssigneeRole.CUSTOM) {
      throw new BadRequestException(
        'CUSTOM assignee role is not valid on templates — reassign tasks on the instance instead',
      );
    }

    const template = await this.prisma.onboardingTemplate.findFirst({
      where: { id: templateId, organizationId },
    });
    if (!template) {
      throw new NotFoundException(
        `Onboarding template ${templateId} not found in your organization`,
      );
    }

    // Shift existing tasks at or above dto.sortOrder to keep uniqueness
    return this.prisma.$transaction(async (tx) => {
      await tx.onboardingTemplateTask.updateMany({
        where: { templateId, sortOrder: { gte: dto.sortOrder } },
        data: { sortOrder: { increment: 1 } },
      });

      return tx.onboardingTemplateTask.create({
        data: {
          templateId,
          title: dto.title,
          description: dto.description ?? null,
          assigneeRole: dto.assigneeRole,
          offsetDays: dto.offsetDays,
          sortOrder: dto.sortOrder,
          isRequired: dto.isRequired ?? true,
          allowDocument: dto.allowDocument ?? false,
        },
      });
    });
  }

  async updateTask(
    organizationId: string,
    templateId: string,
    taskId: string,
    dto: UpdateTemplateTaskDto,
  ) {
    if (dto.assigneeRole === OnboardingTaskAssigneeRole.CUSTOM) {
      throw new BadRequestException(
        'CUSTOM assignee role is not valid on templates',
      );
    }

    const task = await this.prisma.onboardingTemplateTask.findFirst({
      where: {
        id: taskId,
        templateId,
        template: { organizationId },
      },
    });
    if (!task) {
      throw new NotFoundException(
        `Template task ${taskId} not found in template ${templateId}`,
      );
    }

    if (dto.sortOrder !== undefined && dto.sortOrder !== task.sortOrder) {
      throw new BadRequestException(
        'Use the reorder endpoint to change sortOrder',
      );
    }

    return this.prisma.onboardingTemplateTask.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.assigneeRole !== undefined && { assigneeRole: dto.assigneeRole }),
        ...(dto.offsetDays !== undefined && { offsetDays: dto.offsetDays }),
        ...(dto.isRequired !== undefined && { isRequired: dto.isRequired }),
        ...(dto.allowDocument !== undefined && { allowDocument: dto.allowDocument }),
      },
    });
  }

  async deleteTask(
    organizationId: string,
    templateId: string,
    taskId: string,
  ) {
    const task = await this.prisma.onboardingTemplateTask.findFirst({
      where: {
        id: taskId,
        templateId,
        template: { organizationId },
      },
    });
    if (!task) {
      throw new NotFoundException(
        `Template task ${taskId} not found in template ${templateId}`,
      );
    }

    return this.prisma.onboardingTemplateTask.delete({
      where: { id: taskId },
    });
  }

  async reorderTasks(
    organizationId: string,
    templateId: string,
    dto: ReorderTemplateTasksDto,
  ) {
    const template = await this.prisma.onboardingTemplate.findFirst({
      where: { id: templateId, organizationId },
    });
    if (!template) {
      throw new NotFoundException(
        `Onboarding template ${templateId} not found in your organization`,
      );
    }

    const tasks = await this.prisma.onboardingTemplateTask.findMany({
      where: { templateId },
      select: { id: true },
    });
    const taskIdSet = new Set(tasks.map((t) => t.id));

    if (dto.order.length !== tasks.length) {
      throw new BadRequestException(
        'Reorder payload must include every task of the template',
      );
    }

    const seenOrders = new Set<number>();
    for (const item of dto.order) {
      if (!taskIdSet.has(item.taskId)) {
        throw new BadRequestException(
          `Task ${item.taskId} does not belong to this template`,
        );
      }
      if (seenOrders.has(item.sortOrder)) {
        throw new BadRequestException('Duplicate sortOrder values not allowed');
      }
      seenOrders.add(item.sortOrder);
    }

    // Two-phase update to avoid unique (templateId, sortOrder) violations
    return this.prisma.$transaction(async (tx) => {
      const offset = 10000;
      for (const item of dto.order) {
        await tx.onboardingTemplateTask.update({
          where: { id: item.taskId },
          data: { sortOrder: item.sortOrder + offset },
        });
      }
      for (const item of dto.order) {
        await tx.onboardingTemplateTask.update({
          where: { id: item.taskId },
          data: { sortOrder: item.sortOrder },
        });
      }

      return tx.onboardingTemplateTask.findMany({
        where: { templateId },
        orderBy: { sortOrder: 'asc' },
      });
    });
  }
}
