import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SetSalaryStructureDto } from '../dto/set-salary-structure.dto';

@Injectable()
export class SalaryStructuresService {
  constructor(private readonly prisma: PrismaService) {}

  async setSalaryStructure(organizationId: string, dto: SetSalaryStructureDto) {
    // Validate employee exists
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, organizationId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found in this organization');
    }

    if (!dto.components.length) {
      throw new BadRequestException('At least one salary component is required');
    }

    // Validate all components exist and belong to org
    const componentIds = dto.components.map((c) => c.salaryComponentId);
    const components = await this.prisma.salaryComponent.findMany({
      where: { id: { in: componentIds }, organizationId, isActive: true },
    });
    if (components.length !== componentIds.length) {
      throw new BadRequestException('One or more salary components are invalid or inactive');
    }

    // Compute totals
    const componentMap = new Map(components.map((c) => [c.id, c]));
    let grossSalary = new Prisma.Decimal(0);
    let totalDeductions = new Prisma.Decimal(0);

    for (const item of dto.components) {
      const comp = componentMap.get(item.salaryComponentId)!;
      const amount = new Prisma.Decimal(item.amount);
      if (comp.type === 'EARNING') {
        grossSalary = grossSalary.add(amount);
      } else {
        totalDeductions = totalDeductions.add(amount);
      }
    }

    const netSalary = grossSalary.sub(totalDeductions);

    return this.prisma.$transaction(async (tx) => {
      // Soft-deactivate previous structures for this employee
      await tx.employeeSalaryStructure.updateMany({
        where: { employeeId: dto.employeeId, organizationId, isActive: true },
        data: { isActive: false },
      });

      // Create new structure with components
      return tx.employeeSalaryStructure.create({
        data: {
          organizationId,
          employeeId: dto.employeeId,
          effectiveFrom: new Date(dto.effectiveFrom),
          grossSalary,
          totalDeductions,
          netSalary,
          notes: dto.notes ?? null,
          isActive: true,
          components: {
            create: dto.components.map((c) => ({
              salaryComponentId: c.salaryComponentId,
              amount: new Prisma.Decimal(c.amount),
            })),
          },
        },
        include: {
          components: {
            include: {
              salaryComponent: {
                select: { id: true, name: true, code: true, type: true },
              },
            },
          },
        },
      });
    });
  }

  async getEmployeeSalaryStructure(organizationId: string, employeeId: string) {
    const structure = await this.prisma.employeeSalaryStructure.findFirst({
      where: { employeeId, organizationId, isActive: true },
      orderBy: { effectiveFrom: 'desc' },
      include: {
        components: {
          include: {
            salaryComponent: {
              select: { id: true, name: true, code: true, type: true },
            },
          },
        },
      },
    });
    if (!structure) {
      throw new NotFoundException('No active salary structure found for this employee');
    }
    return structure;
  }

  async getSalaryHistory(organizationId: string, employeeId: string) {
    return this.prisma.employeeSalaryStructure.findMany({
      where: { employeeId, organizationId },
      orderBy: { effectiveFrom: 'desc' },
      include: {
        components: {
          include: {
            salaryComponent: {
              select: { id: true, name: true, code: true, type: true },
            },
          },
        },
      },
    });
  }

  async getEffectiveStructureForDate(
    employeeId: string,
    organizationId: string,
    date: Date,
  ) {
    return this.prisma.employeeSalaryStructure.findFirst({
      where: {
        employeeId,
        organizationId,
        isActive: true,
        effectiveFrom: { lte: date },
      },
      orderBy: { effectiveFrom: 'desc' },
      include: {
        components: {
          include: {
            salaryComponent: {
              select: { id: true, name: true, code: true, type: true },
            },
          },
        },
      },
    });
  }
}
