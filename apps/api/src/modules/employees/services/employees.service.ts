import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { UpdateSelfEmployeeDto } from '../dto/update-self-employee.dto';
import { CreateEmploymentDetailDto } from '../dto/create-employment-detail.dto';
import { UpdateEmploymentDetailDto } from '../dto/update-employment-detail.dto';
import { STORAGE_SERVICE } from '../../storage/storage.module';
import type { StorageService } from '../../storage/storage.types';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

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
      const created = await this.prisma.employee.create({
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
          profileImageUrl: dto.profileImageUrl ?? null,
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
      return this.withPhoto(created);
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
    const rows = await this.prisma.employee.findMany({
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
    return this.withPhotoMany(rows);
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
    return this.withPhoto(employee);
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

    const updated = await this.prisma.employee.update({
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
        ...(dto.profileImageUrl !== undefined && { profileImageUrl: dto.profileImageUrl }),
      },
      include: this.defaultInclude(),
    });
    return this.withPhoto(updated);
  }

  // ─── Self-service ───────────────────────────

  /**
   * Get the calling user's employee record. Returns null if no employee row
   * is linked to this user/org pair (e.g. the user is an org admin without
   * an employee profile).
   */
  async findMe(organizationId: string, userId: string) {
    const me = await this.prisma.employee.findFirst({
      where: { userId, organizationId },
      include: this.defaultInclude(),
    });
    return this.withPhoto(me);
  }

  /**
   * Self-service update. Used for the "change my photo" flow on /profile —
   * narrowly scoped (UpdateSelfEmployeeDto) so users with only
   * `employee.read_own` can't escalate.
   */
  async updateMe(organizationId: string, userId: string, dto: UpdateSelfEmployeeDto) {
    const me = await this.prisma.employee.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    });
    if (!me) {
      throw new NotFoundException(
        'No employee profile is linked to your account in this organization.',
      );
    }

    const updated = await this.prisma.employee.update({
      where: { id: me.id },
      data: {
        ...(dto.profileImageUrl !== undefined && { profileImageUrl: dto.profileImageUrl }),
      },
      include: this.defaultInclude(),
    });
    return this.withPhoto(updated);
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

    return this.withPhotoMany([me, ...reports]);
  }

  async deactivate(organizationId: string, id: string) {
    await this.findById(organizationId, id);
    return this.prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async reactivate(organizationId: string, id: string) {
    const existing = await this.prisma.employee.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Employee not found');
    return this.prisma.employee.update({
      where: { id },
      data: { isActive: true },
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

  /**
   * Resolve `profileImageUrl` on an employee shape: if it's a storage key,
   * mint a fresh signed URL so the browser can render it without a follow-up
   * round-trip. Legacy absolute URLs pass through unchanged. Failures are
   * swallowed (key missing in storage, etc.) — we just null out the field.
   */
  private async resolvePhotoUrl(value: string | null): Promise<string | null> {
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    try {
      return await this.storage.getDownloadUrl(value);
    } catch (err) {
      this.logger.warn(`Failed to resolve profile photo url for key ${value}: ${err}`);
      return null;
    }
  }

  /**
   * Wrap a single employee row, replacing `profileImageUrl` with a renderable URL.
   */
  private async withPhoto<T extends { profileImageUrl: string | null } | null>(employee: T): Promise<T> {
    if (!employee) return employee;
    const url = await this.resolvePhotoUrl(employee.profileImageUrl);
    return { ...employee, profileImageUrl: url } as T;
  }

  /**
   * Wrap a list of employees, resolving photo URLs in parallel.
   */
  private async withPhotoMany<T extends { profileImageUrl: string | null }>(rows: T[]): Promise<T[]> {
    return Promise.all(rows.map((r) => this.withPhoto(r)));
  }

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
