import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAttendancePolicyDto } from '../dto/create-attendance-policy.dto';
import { UpdateAttendancePolicyDto } from '../dto/update-attendance-policy.dto';
import { AssignPolicyDto } from '../dto/assign-policy.dto';

@Injectable()
export class AttendancePoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Policy CRUD ─────────────────────────

  async create(organizationId: string, dto: CreateAttendancePolicyDto) {
    this.validatePolicyFields(dto);

    try {
      return await this.prisma.attendancePolicy.create({
        data: {
          organizationId,
          name: dto.name,
          policyType: dto.policyType,
          startTime: dto.startTime ?? null,
          endTime: dto.endTime ?? null,
          minHoursPerDay: dto.minHoursPerDay ?? null,
          coreStartTime: dto.coreStartTime ?? null,
          coreEndTime: dto.coreEndTime ?? null,
          graceMinutesLate: dto.graceMinutesLate ?? 0,
          graceMinutesEarly: dto.graceMinutesEarly ?? 0,
          halfDayThresholdMinutes: dto.halfDayThresholdMinutes ?? null,
          workingDays: dto.workingDays ?? [1, 2, 3, 4, 5],
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A policy with this name already exists in this organization',
        );
      }
      throw error;
    }
  }

  async findAll(organizationId: string) {
    return this.prisma.attendancePolicy.findMany({
      where: { organizationId },
      include: { _count: { select: { assignments: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const policy = await this.prisma.attendancePolicy.findFirst({
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
    if (!policy) throw new NotFoundException('Attendance policy not found');
    return policy;
  }

  async update(organizationId: string, id: string, dto: UpdateAttendancePolicyDto) {
    await this.findById(organizationId, id);

    try {
      return await this.prisma.attendancePolicy.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.policyType !== undefined && { policyType: dto.policyType }),
          ...(dto.startTime !== undefined && { startTime: dto.startTime }),
          ...(dto.endTime !== undefined && { endTime: dto.endTime }),
          ...(dto.minHoursPerDay !== undefined && { minHoursPerDay: dto.minHoursPerDay }),
          ...(dto.coreStartTime !== undefined && { coreStartTime: dto.coreStartTime }),
          ...(dto.coreEndTime !== undefined && { coreEndTime: dto.coreEndTime }),
          ...(dto.graceMinutesLate !== undefined && {
            graceMinutesLate: dto.graceMinutesLate,
          }),
          ...(dto.graceMinutesEarly !== undefined && {
            graceMinutesEarly: dto.graceMinutesEarly,
          }),
          ...(dto.halfDayThresholdMinutes !== undefined && {
            halfDayThresholdMinutes: dto.halfDayThresholdMinutes,
          }),
          ...(dto.workingDays !== undefined && { workingDays: dto.workingDays }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A policy with this name already exists in this organization',
        );
      }
      throw error;
    }
  }

  async deactivate(organizationId: string, id: string) {
    await this.findById(organizationId, id);
    return this.prisma.attendancePolicy.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Policy Assignments ──────────────────

  async assignPolicy(organizationId: string, policyId: string, dto: AssignPolicyDto) {
    await this.findById(organizationId, policyId);

    // Validate employee belongs to org
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, organizationId },
    });
    if (!employee) throw new NotFoundException('Employee not found in this organization');

    // Close any existing open assignment for this employee
    await this.prisma.employeeAttendancePolicyAssignment.updateMany({
      where: {
        employeeId: dto.employeeId,
        effectiveTo: null,
      },
      data: {
        effectiveTo: new Date(dto.effectiveFrom),
      },
    });

    return this.prisma.employeeAttendancePolicyAssignment.create({
      data: {
        employeeId: dto.employeeId,
        attendancePolicyId: policyId,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        attendancePolicy: {
          select: { id: true, name: true, policyType: true },
        },
      },
    });
  }

  async removeAssignment(organizationId: string, policyId: string, assignmentId: string) {
    await this.findById(organizationId, policyId);

    const assignment = await this.prisma.employeeAttendancePolicyAssignment.findFirst({
      where: { id: assignmentId, attendancePolicyId: policyId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    return this.prisma.employeeAttendancePolicyAssignment.delete({
      where: { id: assignmentId },
    });
  }

  // ─── Effective Policy For Current User ───
  /**
   * Returns the AttendancePolicy that applies to the given user today.
   * Resolution order:
   *   1. Active EmployeeAttendancePolicyAssignment covering today (effectiveFrom <= today <= effectiveTo|null)
   *   2. Org's most-recent active policy (fallback)
   *   3. null
   * Used by the UI to know if today is a working day for the current user.
   */
  async getEffectivePolicyForUser(userId: string, organizationId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId, organizationId, isActive: true },
      select: { id: true },
    });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (employee) {
      const assignment = await this.prisma.employeeAttendancePolicyAssignment.findFirst({
        where: {
          employeeId: employee.id,
          effectiveFrom: { lte: today },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
          attendancePolicy: { organizationId },
        },
        include: { attendancePolicy: true },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (assignment?.attendancePolicy) {
        return assignment.attendancePolicy;
      }
    }

    // Fallback: org's most-recent active policy
    return this.prisma.attendancePolicy.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Helpers ─────────────────────────────

  private validatePolicyFields(dto: CreateAttendancePolicyDto) {
    if (dto.policyType === 'FIXED') {
      if (!dto.startTime || !dto.endTime) {
        throw new BadRequestException('Fixed policies require startTime and endTime');
      }
    }
    if (dto.policyType === 'FLEXIBLE') {
      if (dto.minHoursPerDay === undefined || dto.minHoursPerDay === null) {
        throw new BadRequestException('Flexible policies require minHoursPerDay');
      }
    }
  }
}
