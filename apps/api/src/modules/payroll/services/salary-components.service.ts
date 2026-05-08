import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSalaryComponentDto } from '../dto/create-salary-component.dto';
import { UpdateSalaryComponentDto } from '../dto/update-salary-component.dto';

@Injectable()
export class SalaryComponentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateSalaryComponentDto) {
    try {
      return await this.prisma.salaryComponent.create({
        data: {
          organizationId,
          name: dto.name,
          code: dto.code,
          type: dto.type,
          description: dto.description ?? null,
          isTaxable: dto.isTaxable ?? false,
          isDefault: dto.isDefault ?? false,
          sortOrder: dto.sortOrder ?? 0,
          formulaBase: dto.formulaBase ?? 'FIXED',
          formulaValue:
            dto.formulaValue !== undefined
              ? new Prisma.Decimal(dto.formulaValue)
              : null,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A salary component with this code already exists in this organization',
        );
      }
      throw error;
    }
  }

  async findAll(organizationId: string) {
    return this.prisma.salaryComponent.findMany({
      where: { organizationId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findById(organizationId: string, id: string) {
    const component = await this.prisma.salaryComponent.findFirst({
      where: { id, organizationId },
    });
    if (!component) throw new NotFoundException('Salary component not found');
    return component;
  }

  async update(organizationId: string, id: string, dto: UpdateSalaryComponentDto) {
    await this.findById(organizationId, id);

    return this.prisma.salaryComponent.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isTaxable !== undefined && { isTaxable: dto.isTaxable }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.formulaBase !== undefined && { formulaBase: dto.formulaBase }),
        ...(dto.formulaValue !== undefined && {
          formulaValue:
            dto.formulaValue === null
              ? null
              : new Prisma.Decimal(dto.formulaValue),
        }),
      },
    });
  }

  async deactivate(organizationId: string, id: string) {
    await this.findById(organizationId, id);
    return this.prisma.salaryComponent.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
