import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAllowedIpRuleDto } from '../dto/create-allowed-ip-rule.dto';
import { UpdateAllowedIpRuleDto } from '../dto/update-allowed-ip-rule.dto';
import { SetEmployeeOverrideDto } from '../dto/set-employee-override.dto';

@Injectable()
export class IpRestrictionService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── IP Validation ───────────────────────

  async validateIp(
    organizationId: string,
    employeeId: string,
    ipAddress: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // 1. Check employee override
    const override = await this.prisma.employeeAttendanceOverride.findUnique({
      where: { employeeId },
    });
    if (override?.ipRestrictionExempt) {
      return { allowed: true };
    }

    // 2. Get active IP rules for org
    // No rules = no restriction (settings-ready: org-level toggle can be added later)
    const rules = await this.prisma.allowedIpRule.findMany({
      where: { organizationId, isActive: true },
    });
    if (rules.length === 0) {
      return { allowed: true };
    }

    // 3. Check if IP matches any rule (exact match)
    const isAllowed = rules.some((rule) => rule.ipAddress === ipAddress);
    if (!isAllowed) {
      return {
        allowed: false,
        reason: 'Your current IP address is not in the allowed list for attendance',
      };
    }

    return { allowed: true };
  }

  // ─── IP Rules CRUD ───────────────────────

  async createRule(organizationId: string, dto: CreateAllowedIpRuleDto) {
    return this.prisma.allowedIpRule.create({
      data: {
        organizationId,
        label: dto.label,
        ipAddress: dto.ipAddress,
      },
    });
  }

  async findAllRules(organizationId: string) {
    return this.prisma.allowedIpRule.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRule(organizationId: string, id: string, dto: UpdateAllowedIpRuleDto) {
    const rule = await this.prisma.allowedIpRule.findFirst({
      where: { id, organizationId },
    });
    if (!rule) throw new NotFoundException('IP rule not found');

    return this.prisma.allowedIpRule.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.ipAddress !== undefined && { ipAddress: dto.ipAddress }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteRule(organizationId: string, id: string) {
    const rule = await this.prisma.allowedIpRule.findFirst({
      where: { id, organizationId },
    });
    if (!rule) throw new NotFoundException('IP rule not found');

    return this.prisma.allowedIpRule.delete({ where: { id } });
  }

  // ─── Employee Overrides ──────────────────

  async setOverride(organizationId: string, employeeId: string, dto: SetEmployeeOverrideDto) {
    // Validate employee belongs to org
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });
    if (!employee) throw new NotFoundException('Employee not found in this organization');

    return this.prisma.employeeAttendanceOverride.upsert({
      where: { employeeId },
      update: {
        ipRestrictionExempt: dto.ipRestrictionExempt,
        reason: dto.reason ?? null,
      },
      create: {
        employeeId,
        ipRestrictionExempt: dto.ipRestrictionExempt,
        reason: dto.reason ?? null,
      },
    });
  }

  async getOverride(organizationId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });
    if (!employee) throw new NotFoundException('Employee not found in this organization');

    return this.prisma.employeeAttendanceOverride.findUnique({
      where: { employeeId },
    });
  }

  async removeOverride(organizationId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });
    if (!employee) throw new NotFoundException('Employee not found in this organization');

    const existing = await this.prisma.employeeAttendanceOverride.findUnique({
      where: { employeeId },
    });
    if (!existing) throw new NotFoundException('No attendance override found for this employee');

    return this.prisma.employeeAttendanceOverride.delete({ where: { employeeId } });
  }
}
