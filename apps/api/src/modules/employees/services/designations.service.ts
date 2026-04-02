import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDesignationDto } from '../dto/create-designation.dto';
import { UpdateDesignationDto } from '../dto/update-designation.dto';

@Injectable()
export class DesignationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateDesignationDto) {
    try {
      return await this.prisma.designation.create({
        data: {
          organizationId,
          name: dto.name,
          level: dto.level ?? 0,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Designation name already exists in this organization');
      }
      throw error;
    }
  }

  async findAll(organizationId: string) {
    return this.prisma.designation.findMany({
      where: { organizationId },
      orderBy: { level: 'asc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const designation = await this.prisma.designation.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { employees: true } } },
    });
    if (!designation) throw new NotFoundException('Designation not found');
    return designation;
  }

  async update(organizationId: string, id: string, dto: UpdateDesignationDto) {
    await this.findById(organizationId, id);

    try {
      return await this.prisma.designation.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.level !== undefined && { level: dto.level }),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Designation name already exists in this organization');
      }
      throw error;
    }
  }

  async deactivate(organizationId: string, id: string) {
    await this.findById(organizationId, id);
    return this.prisma.designation.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
