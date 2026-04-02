import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLeavePolicyDto } from '../dto/create-leave-policy.dto';
import { UpdateLeavePolicyDto } from '../dto/update-leave-policy.dto';
import { AssignLeavePolicyDto } from '../dto/assign-leave-policy.dto';

@Injectable()
export class LeavePoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Policy CRUD ──────────────────────

  async create(organizationId: string, dto: CreateLeavePolicyDto) {
    try {
      return await this.prisma.leavePolicy.create({
        data: {
          organizationId,
          name: dto.name,
          code: dto.code,
          description: dto.description ?? null,
          annualQuotaDefault: dto.annualQuotaDefault,
          carryForwardLimit: dto.carryForwardLimit ?? 0,
          maxConsecutiveDays: dto.maxConsecutiveDays ?? null,
          allowHalfDay: dto.allowHalfDay ?? true,
          requiresApproval: dto.requiresApproval ?? true,
          isPaid: dto.isPaid ?? true,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A leave policy with this code already exists in this organization',
        );
      }
      throw error;
    }
  }

  async findAll(organizationId: string) {
    return this.prisma.leavePolicy.findMany({
      where: { organizationId },
      include: { _count: { select: { assignments: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const policy = await this.prisma.leavePolicy.findFirst({
      where: { id, organizationId },
      include: {
        assignments: {
          include: {
            employee: {
              select: { id: true, employeeCode: true, firstName: true, lastName: true },
            },
          },
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    });
    if (!policy) throw new NotFoundException('Leave policy not found');
    return policy;
  }

  async update(organizationId: string, id: string, dto: UpdateLeavePolicyDto) {
    await this.findById(organizationId, id);

    try {
      return await this.prisma.leavePolicy.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.code !== undefined && { code: dto.code }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.annualQuotaDefault !== undefined && {
            annualQuotaDefault: dto.annualQuotaDefault,
          }),
          ...(dto.carryForwardLimit !== undefined && {
            carryForwardLimit: dto.carryForwardLimit,
          }),
          ...(dto.maxConsecutiveDays !== undefined && {
            maxConsecutiveDays: dto.maxConsecutiveDays,
          }),
          ...(dto.allowHalfDay !== undefined && { allowHalfDay: dto.allowHalfDay }),
          ...(dto.requiresApproval !== undefined && {
            requiresApproval: dto.requiresApproval,
          }),
          ...(dto.isPaid !== undefined && { isPaid: dto.isPaid }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A leave policy with this code already exists in this organization',
        );
      }
      throw error;
    }
  }

  async deactivate(organizationId: string, id: string) {
    await this.findById(organizationId, id);
    return this.prisma.leavePolicy.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Policy Assignments ───────────────

  async assignPolicy(
    organizationId: string,
    policyId: string,
    dto: AssignLeavePolicyDto,
  ) {
    await this.findById(organizationId, policyId);

    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, organizationId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found in this organization');
    }

    try {
      return await this.prisma.employeeLeavePolicyAssignment.create({
        data: {
          organizationId,
          employeeId: dto.employeeId,
          leavePolicyId: policyId,
          effectiveFrom: new Date(dto.effectiveFrom),
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
          customAnnualQuota: dto.customAnnualQuota ?? null,
        },
        include: {
          employee: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
          leavePolicy: {
            select: { id: true, name: true, code: true },
          },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'This employee already has an assignment for this policy starting on the same date',
        );
      }
      throw error;
    }
  }

  async removeAssignment(
    organizationId: string,
    policyId: string,
    assignmentId: string,
  ) {
    await this.findById(organizationId, policyId);

    const assignment = await this.prisma.employeeLeavePolicyAssignment.findFirst({
      where: { id: assignmentId, leavePolicyId: policyId, organizationId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    return this.prisma.employeeLeavePolicyAssignment.delete({
      where: { id: assignmentId },
    });
  }
}
