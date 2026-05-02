import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all roles visible to the given organization:
   * - system roles (organizationId = null)
   * - org-specific roles
   */
  async findAllForOrganization(organizationId: string) {
    return this.prisma.role.findMany({
      where: {
        isActive: true,
        OR: [{ organizationId: null }, { organizationId }],
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        _count: { select: { userRoles: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a single role with its permissions.
   */
  async findByIdWithPermissions(roleId: string) {
    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });
  }

  /**
   * List all permissions, grouped by module.
   */
  async findAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  /**
   * Create a new custom org role.
   * Throws ConflictException if the slug already exists in this org.
   */
  async createRole(organizationId: string, dto: CreateRoleDto) {
    try {
      return await this.prisma.role.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          organizationId,
          isSystem: false,
          isActive: true,
        },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      });
    } catch (err: any) {
      // Prisma unique constraint violation
      if (err?.code === 'P2002') {
        throw new ConflictException(`A role with slug "${dto.slug}" already exists in this organization`);
      }
      throw err;
    }
  }

  /**
   * Rename / update description of a custom org role.
   */
  async updateRole(organizationId: string, id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findFirst({ where: { id, organizationId } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new ForbiddenException('System roles cannot be modified');

    return this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });
  }

  /**
   * Replace the full permission set on a role (in a single transaction).
   */
  async updateRolePermissions(organizationId: string, id: string, codes: string[]) {
    const role = await this.prisma.role.findFirst({
      where: {
        id,
        OR: [{ organizationId }, { organizationId: null, isSystem: true }],
      },
    });

    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new ForbiddenException('System roles cannot be modified');
    if (role.organizationId !== organizationId) throw new NotFoundException('Role not found');

    // Validate every provided code is a known permission
    const perms = await this.prisma.permission.findMany({ where: { code: { in: codes } } });
    if (perms.length !== codes.length) {
      const known = new Set(perms.map((p) => p.code));
      const unknown = codes.filter((c) => !known.has(c));
      throw new BadRequestException(`Unknown permission codes: ${unknown.join(', ')}`);
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: perms.map((p) => ({ roleId: id, permissionId: p.id })),
      }),
    ]);

    return this.findByIdWithPermissions(id);
  }

  /**
   * Deactivate (soft-delete) a custom org role.
   */
  async deactivateRole(organizationId: string, id: string) {
    const role = await this.prisma.role.findFirst({ where: { id, organizationId } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new ForbiddenException('System roles cannot be deactivated');

    return this.prisma.role.update({ where: { id }, data: { isActive: false } });
  }
}
