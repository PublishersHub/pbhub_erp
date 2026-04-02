import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateDepartmentDto) {
    // Validate parent belongs to same org if provided
    if (dto.parentId) {
      const parent = await this.prisma.department.findFirst({
        where: { id: dto.parentId, organizationId },
      });
      if (!parent) throw new NotFoundException('Parent department not found');
    }

    try {
      return await this.prisma.department.create({
        data: {
          organizationId,
          name: dto.name,
          code: dto.code.toUpperCase(),
          parentId: dto.parentId ?? null,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Department code already exists in this organization');
      }
      throw error;
    }
  }

  async findAll(organizationId: string) {
    return this.prisma.department.findMany({
      where: { organizationId },
      include: { parent: { select: { id: true, name: true, code: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const department = await this.prisma.department.findFirst({
      where: { id, organizationId },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: { select: { id: true, name: true, code: true, isActive: true } },
        _count: { select: { employees: true } },
      },
    });
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  async update(organizationId: string, id: string, dto: UpdateDepartmentDto) {
    await this.findById(organizationId, id);

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new ConflictException('A department cannot be its own parent');
      }
      const parent = await this.prisma.department.findFirst({
        where: { id: dto.parentId, organizationId },
      });
      if (!parent) throw new NotFoundException('Parent department not found');
    }

    try {
      return await this.prisma.department.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.code !== undefined && { code: dto.code.toUpperCase() }),
          ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Department code already exists in this organization');
      }
      throw error;
    }
  }

  async deactivate(organizationId: string, id: string) {
    await this.findById(organizationId, id);
    return this.prisma.department.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
