import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { CreateEmploymentDetailDto } from '../dto/create-employment-detail.dto';
import { UpdateEmploymentDetailDto } from '../dto/update-employment-detail.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Employee CRUD ──────────────────────────

  async create(organizationId: string, dto: CreateEmployeeDto) {
    // Validate FK references belong to the same org
    if (dto.departmentId) {
      await this.assertOrgOwnership('department', dto.departmentId, organizationId);
    }
    if (dto.designationId) {
      await this.assertOrgOwnership('designation', dto.designationId, organizationId);
    }
    if (dto.reportingManagerId) {
      await this.assertOrgOwnership('employee', dto.reportingManagerId, organizationId);
    }
    if (dto.userId) {
      await this.validateUserLink(dto.userId, organizationId);
    }

    try {
      return await this.prisma.employee.create({
        data: {
          organizationId,
          employeeCode: dto.employeeCode,
          firstName: dto.firstName,
          lastName: dto.lastName,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          gender: dto.gender ?? null,
          phone: dto.phone ?? null,
          personalEmail: dto.personalEmail ?? null,
          departmentId: dto.departmentId ?? null,
          designationId: dto.designationId ?? null,
          reportingManagerId: dto.reportingManagerId ?? null,
          userId: dto.userId ?? null,
          ...(dto.employmentDetail && {
            employmentDetail: {
              create: {
                employmentType: dto.employmentDetail.employmentType,
                joiningDate: new Date(dto.employmentDetail.joiningDate),
                confirmationDate: dto.employmentDetail.confirmationDate
                  ? new Date(dto.employmentDetail.confirmationDate)
                  : null,
                probationEndDate: dto.employmentDetail.probationEndDate
                  ? new Date(dto.employmentDetail.probationEndDate)
                  : null,
                employmentStatus: dto.employmentDetail.employmentStatus ?? 'ACTIVE',
              },
            },
          }),
        },
        include: this.defaultInclude(),
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Employee code already exists in this organization');
      }
      throw error;
    }
  }

  async findAll(
    organizationId: string,
    filters?: {
      departmentId?: string;
      designationId?: string;
      isActive?: boolean;
      search?: string;
    },
  ) {
    return this.prisma.employee.findMany({
      where: {
        organizationId,
        ...(filters?.departmentId && { departmentId: filters.departmentId }),
        ...(filters?.designationId && { designationId: filters.designationId }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters?.search && {
          OR: [
            { firstName: { contains: filters.search, mode: 'insensitive' as const } },
            { lastName: { contains: filters.search, mode: 'insensitive' as const } },
            { employeeCode: { contains: filters.search, mode: 'insensitive' as const } },
          ],
        }),
      },
      include: this.defaultInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, organizationId },
      include: {
        ...this.defaultInclude(),
        employmentDetail: true,
        documents: { orderBy: { createdAt: 'desc' } },
        directReports: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true, isActive: true },
        },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async update(organizationId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findById(organizationId, id);

    if (dto.departmentId) {
      await this.assertOrgOwnership('department', dto.departmentId, organizationId);
    }
    if (dto.designationId) {
      await this.assertOrgOwnership('designation', dto.designationId, organizationId);
    }
    if (dto.reportingManagerId) {
      if (dto.reportingManagerId === id) {
        throw new BadRequestException('An employee cannot report to themselves');
      }
      await this.assertOrgOwnership('employee', dto.reportingManagerId, organizationId);
    }
    if (dto.userId) {
      await this.validateUserLink(dto.userId, organizationId, id);
    }

    return this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.dateOfBirth !== undefined && {
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.personalEmail !== undefined && { personalEmail: dto.personalEmail }),
        ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
        ...(dto.designationId !== undefined && { designationId: dto.designationId }),
        ...(dto.reportingManagerId !== undefined && {
          reportingManagerId: dto.reportingManagerId,
        }),
        ...(dto.userId !== undefined && { userId: dto.userId }),
      },
      include: this.defaultInclude(),
    });
  }

  /**
   * Returns the employee profile of the calling user plus all employees who
   * report to them. Requires the user to have an Employee row linked via
   * userId. Returns [] if the user has no employee profile.
   */
  async findMyTeam(organizationId: string, userId: string) {
    // userId here is the per-org User membership id (AuthenticatedUser.userId)
    const me = await this.prisma.employee.findFirst({
      where: { userId, organizationId },
      include: this.defaultInclude(),
    });

    if (!me) return [];

    const reports = await this.prisma.employee.findMany({
      where: {
        organizationId,
        reportingManagerId: me.id,
      },
      include: this.defaultInclude(),
      orderBy: { firstName: 'asc' },
    });

    return [me, ...reports];
  }

  async deactivate(organizationId: string, id: string) {
    await this.findById(organizationId, id);
    return this.prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Employment Detail ──────────────────────

  /**
   * PUT semantics: create or fully replace employment detail.
   * All required creation fields are guaranteed by CreateEmploymentDetailDto.
   */
  async createOrReplaceEmploymentDetail(
    organizationId: string,
    employeeId: string,
    dto: CreateEmploymentDetailDto,
  ) {
    await this.findById(organizationId, employeeId);

    const data = {
      employmentType: dto.employmentType,
      joiningDate: new Date(dto.joiningDate),
      confirmationDate: dto.confirmationDate ? new Date(dto.confirmationDate) : null,
      probationEndDate: dto.probationEndDate ? new Date(dto.probationEndDate) : null,
      employmentStatus: dto.employmentStatus ?? 'ACTIVE',
    };

    return this.prisma.employeeEmploymentDetail.upsert({
      where: { employeeId },
      update: data,
      create: { employeeId, ...data },
    });
  }

  /**
   * PATCH semantics: partial update of an existing employment detail.
   * Throws 404 if the detail does not exist yet — caller must use PUT first.
   */
  async updateEmploymentDetail(
    organizationId: string,
    employeeId: string,
    dto: UpdateEmploymentDetailDto,
  ) {
    await this.findById(organizationId, employeeId);

    const existing = await this.prisma.employeeEmploymentDetail.findUnique({
      where: { employeeId },
    });
    if (!existing) {
      throw new NotFoundException(
        'Employment detail does not exist yet. Use PUT to create it first.',
      );
    }

    return this.prisma.employeeEmploymentDetail.update({
      where: { employeeId },
      data: {
        ...(dto.employmentType !== undefined && { employmentType: dto.employmentType }),
        ...(dto.joiningDate !== undefined && { joiningDate: new Date(dto.joiningDate) }),
        ...(dto.confirmationDate !== undefined && {
          confirmationDate: dto.confirmationDate ? new Date(dto.confirmationDate) : null,
        }),
        ...(dto.probationEndDate !== undefined && {
          probationEndDate: dto.probationEndDate ? new Date(dto.probationEndDate) : null,
        }),
        ...(dto.employmentStatus !== undefined && { employmentStatus: dto.employmentStatus }),
      },
    });
  }

  // ─── Helpers ────────────────────────────────

  private defaultInclude() {
    return {
      department: { select: { id: true, name: true, code: true } },
      designation: { select: { id: true, name: true, level: true } },
      reportingManager: {
        select: { id: true, employeeCode: true, firstName: true, lastName: true },
      },
    };
  }

  /**
   * Validate that a user exists in the same org AND is not already linked
   * to a different employee. Pass excludeEmployeeId when updating an
   * existing employee so re-linking to the same user is allowed.
   */
  private async validateUserLink(
    userId: string,
    organizationId: string,
    excludeEmployeeId?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.organizationId !== organizationId) {
      throw new NotFoundException('User not found in this organization');
    }

    const existingLink = await this.prisma.employee.findUnique({
      where: { userId },
    });
    if (existingLink && existingLink.id !== excludeEmployeeId) {
      throw new ConflictException('This user account is already linked to another employee');
    }
  }

  private async assertOrgOwnership(
    entity: 'department' | 'designation' | 'employee',
    id: string,
    organizationId: string,
  ) {
    const record = await (this.prisma[entity] as any).findFirst({
      where: { id, organizationId },
    });
    if (!record) {
      throw new NotFoundException(
        `${entity.charAt(0).toUpperCase() + entity.slice(1)} not found in this organization`,
      );
    }
  }
}
