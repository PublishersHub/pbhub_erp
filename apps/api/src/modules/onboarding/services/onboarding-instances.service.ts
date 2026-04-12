import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  OnboardingTaskAssigneeRole,
  OnboardingTaskStatus,
  OnboardingInstanceStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateOnboardingInstanceDto } from '../dto/create-onboarding-instance.dto';
import { CancelOnboardingInstanceDto } from '../dto/cancel-onboarding-instance.dto';
import { NotificationEvents } from '../../notification/events/event-types';

interface StartForNewHireParams {
  organizationId: string;
  employeeId: string;
  joiningDate: Date;
  createdByUserId?: string | null;
}

@Injectable()
export class OnboardingInstancesService {
  private readonly logger = new Logger(OnboardingInstancesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Hire-flow entry point ──────────────

  /**
   * Called from HireService.hireAndNotify after a successful hire.
   * Idempotent: if an instance already exists for this employee (e.g. retry),
   * returns the existing one without error.
   */
  async startForNewHire(params: StartForNewHireParams) {
    // Idempotent guard: return existing instance on retry
    const existing = await this.prisma.onboardingInstance.findUnique({
      where: { employeeId: params.employeeId },
    });
    if (existing) {
      this.logger.log(
        `Onboarding instance already exists for employee ${params.employeeId} — returning existing`,
      );
      return existing;
    }

    const template = await this.prisma.onboardingTemplate.findFirst({
      where: {
        organizationId: params.organizationId,
        isDefault: true,
        isActive: true,
      },
      include: {
        tasks: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!template) {
      this.logger.log(
        `No active default onboarding template for org ${params.organizationId} — skipping auto-start`,
      );
      return null;
    }

    return this.createInstance({
      organizationId: params.organizationId,
      employeeId: params.employeeId,
      joiningDate: params.joiningDate,
      templateId: template.id,
      createdByUserId: params.createdByUserId ?? null,
    });
  }

  // ─── Manual creation (HR endpoint) ──────

  async createFromDto(
    userId: string,
    organizationId: string,
    dto: CreateOnboardingInstanceDto,
  ) {
    const joiningDate = new Date(dto.joiningDate);
    if (isNaN(joiningDate.getTime())) {
      throw new BadRequestException('Invalid joiningDate');
    }

    // Resolve which template to use
    let templateId = dto.templateId;
    if (!templateId) {
      const defaultTemplate = await this.prisma.onboardingTemplate.findFirst({
        where: {
          organizationId,
          isDefault: true,
          isActive: true,
        },
        select: { id: true },
      });
      if (!defaultTemplate) {
        throw new BadRequestException(
          'No active default onboarding template — pass templateId explicitly',
        );
      }
      templateId = defaultTemplate.id;
    }

    return this.createInstance({
      organizationId,
      employeeId: dto.employeeId,
      joiningDate,
      templateId,
      createdByUserId: userId,
    });
  }

  // ─── Core instance creation ─────────────

  private async createInstance(params: {
    organizationId: string;
    employeeId: string;
    joiningDate: Date;
    templateId: string;
    createdByUserId: string | null;
  }) {
    const {
      organizationId,
      employeeId,
      joiningDate,
      templateId,
      createdByUserId,
    } = params;

    // Load template with all tasks
    const template = await this.prisma.onboardingTemplate.findFirst({
      where: { id: templateId, organizationId },
      include: {
        tasks: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!template) {
      throw new NotFoundException(
        `Onboarding template ${templateId} not found in your organization`,
      );
    }
    if (!template.isActive) {
      throw new BadRequestException(
        `Onboarding template "${template.name}" is inactive`,
      );
    }

    // Load employee (for reportingManagerId)
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        reportingManagerId: true,
      },
    });
    if (!employee) {
      throw new NotFoundException(
        `Employee ${employeeId} not found in your organization`,
      );
    }

    // Guard: one instance per employee
    const existing = await this.prisma.onboardingInstance.findUnique({
      where: { employeeId },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        `An onboarding instance already exists for employee ${employee.employeeCode}`,
      );
    }

    // Resolve HR and IT assignees once (cached for this call)
    const hrEmployeeId = await this.resolveRoleAssignee(organizationId, [
      'hr_admin',
    ]);
    const itEmployeeId = await this.resolveRoleAssignee(organizationId, [
      'it_admin',
    ]);

    const joiningDay = this.toUtcMidnight(joiningDate);

    const taskData = template.tasks.map((t) => {
      const assigneeEmployeeId = this.resolveAssignee(t.assigneeRole, {
        newHireEmployeeId: employee.id,
        reportingManagerId: employee.reportingManagerId,
        hrEmployeeId,
        itEmployeeId,
      });
      const dueDate = new Date(joiningDay);
      dueDate.setUTCDate(dueDate.getUTCDate() + t.offsetDays);
      return {
        templateTaskId: t.id,
        title: t.title,
        description: t.description,
        assigneeRole: t.assigneeRole,
        assigneeEmployeeId,
        sortOrder: t.sortOrder,
        isRequired: t.isRequired,
        allowDocument: t.allowDocument,
        dueDate,
      };
    });

    // Transaction: create instance + tasks (NO events inside)
    let instanceId: string;
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const instance = await tx.onboardingInstance.create({
          data: {
            organizationId,
            employeeId,
            templateId: template.id,
            templateName: template.name,
            joiningDate: joiningDay,
            status: OnboardingInstanceStatus.NOT_STARTED,
            createdByUserId,
          },
        });

        if (taskData.length > 0) {
          await tx.onboardingTask.createMany({
            data: taskData.map((d) => ({
              onboardingInstanceId: instance.id,
              templateTaskId: d.templateTaskId,
              title: d.title,
              description: d.description,
              assigneeRole: d.assigneeRole,
              assigneeEmployeeId: d.assigneeEmployeeId,
              sortOrder: d.sortOrder,
              isRequired: d.isRequired,
              allowDocument: d.allowDocument,
              dueDate: d.dueDate,
            })),
          });
        }

        return instance;
      });
      instanceId = created.id;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          `An onboarding instance already exists for employee ${employee.employeeCode}`,
        );
      }
      throw error;
    }

    // Emit AFTER transaction commit — deduplicated recipient list
    const employeeName = `${employee.firstName} ${employee.lastName}`;
    const joiningDateStr = joiningDay.toISOString().slice(0, 10);

    const uniqueAssignees = Array.from(
      new Set(
        taskData
          .map((t) => t.assigneeEmployeeId)
          .filter((id): id is string => id !== null),
      ),
    );

    this.eventEmitter.emit(NotificationEvents.ONBOARDING_STARTED, {
      organizationId,
      actorUserId: createdByUserId,
      referenceId: instanceId,
      referenceType: 'OnboardingInstance',
      recipientEmployeeIds: uniqueAssignees,
      variables: {
        employeeName,
        employeeCode: employee.employeeCode,
        joiningDate: joiningDateStr,
      },
    });

    return this.findById(organizationId, instanceId);
  }

  // ─── Queries ────────────────────────────

  async findAll(
    organizationId: string,
    filters: { status?: OnboardingInstanceStatus; employeeId?: string },
  ) {
    const instances = await this.prisma.onboardingInstance.findMany({
      where: {
        organizationId,
        ...(filters.status && { status: filters.status }),
        ...(filters.employeeId && { employeeId: filters.employeeId }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
        _count: { select: { tasks: true } },
      },
    });
    return instances;
  }

  async findById(organizationId: string, id: string) {
    const instance = await this.prisma.onboardingInstance.findFirst({
      where: { id, organizationId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            reportingManagerId: true,
          },
        },
        template: { select: { id: true, name: true, isActive: true } },
        tasks: {
          orderBy: { sortOrder: 'asc' },
          include: {
            assigneeEmployee: {
              select: { id: true, firstName: true, lastName: true },
            },
            documents: true,
          },
        },
      },
    });
    if (!instance) {
      throw new NotFoundException(
        `Onboarding instance ${id} not found in your organization`,
      );
    }

    return this.decorateInstance(instance);
  }

  async findMine(userId: string, organizationId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException(
        'No employee profile linked to your user account',
      );
    }

    const instance = await this.prisma.onboardingInstance.findFirst({
      where: { employeeId: employee.id, organizationId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
        template: { select: { id: true, name: true } },
        tasks: {
          orderBy: { sortOrder: 'asc' },
          include: {
            assigneeEmployee: {
              select: { id: true, firstName: true, lastName: true },
            },
            documents: true,
          },
        },
      },
    });
    if (!instance) {
      throw new NotFoundException('No onboarding instance found for you');
    }
    return this.decorateInstance(instance);
  }

  // ─── Cancel ─────────────────────────────

  async cancel(
    organizationId: string,
    id: string,
    dto: CancelOnboardingInstanceDto,
  ) {
    const instance = await this.prisma.onboardingInstance.findFirst({
      where: { id, organizationId },
    });
    if (!instance) {
      throw new NotFoundException(
        `Onboarding instance ${id} not found in your organization`,
      );
    }

    if (
      instance.status === OnboardingInstanceStatus.COMPLETED ||
      instance.status === OnboardingInstanceStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel instance because it is already ${instance.status}`,
      );
    }

    return this.prisma.onboardingInstance.update({
      where: { id },
      data: {
        status: OnboardingInstanceStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: dto.cancelReason ?? null,
      },
    });
  }

  // ─── Helpers ────────────────────────────

  private toUtcMidnight(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private async resolveRoleAssignee(
    organizationId: string,
    roleSlugs: string[],
  ): Promise<string | null> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        organizationId,
        isActive: true,
        user: {
          isActive: true,
          userRoles: {
            some: {
              organizationId,
              role: {
                slug: { in: roleSlugs },
                isActive: true,
              },
            },
          },
        },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    return employee?.id ?? null;
  }

  private resolveAssignee(
    role: OnboardingTaskAssigneeRole,
    ctx: {
      newHireEmployeeId: string;
      reportingManagerId: string | null;
      hrEmployeeId: string | null;
      itEmployeeId: string | null;
    },
  ): string | null {
    switch (role) {
      case OnboardingTaskAssigneeRole.NEW_HIRE:
        return ctx.newHireEmployeeId;
      case OnboardingTaskAssigneeRole.MANAGER:
        return ctx.reportingManagerId ?? ctx.hrEmployeeId;
      case OnboardingTaskAssigneeRole.HR:
        return ctx.hrEmployeeId;
      case OnboardingTaskAssigneeRole.IT:
        return ctx.itEmployeeId ?? ctx.hrEmployeeId;
      case OnboardingTaskAssigneeRole.CUSTOM:
      default:
        return null;
    }
  }

  private decorateInstance<
    T extends {
      tasks: Array<{
        status: OnboardingTaskStatus;
        dueDate: Date;
        [k: string]: unknown;
      }>;
    },
  >(instance: T): T & { tasks: Array<unknown> } {
    const now = Date.now();
    return {
      ...instance,
      tasks: instance.tasks.map((t) => ({
        ...t,
        isOverdue:
          t.status !== OnboardingTaskStatus.COMPLETED &&
          t.dueDate.getTime() < now,
      })),
    };
  }
}
