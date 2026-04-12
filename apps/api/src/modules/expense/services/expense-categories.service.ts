import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateExpenseCategoryDto } from '../dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from '../dto/update-expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateExpenseCategoryDto) {
    const existing = await this.prisma.expenseCategory.findUnique({
      where: { organizationId_code: { organizationId, code: dto.code } },
    });
    if (existing) {
      throw new ConflictException(`Category code "${dto.code}" already exists`);
    }

    return this.prisma.expenseCategory.create({
      data: {
        organizationId,
        name: dto.name,
        code: dto.code,
        description: dto.description ?? null,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, organizationId },
    });
    if (!category) throw new NotFoundException('Expense category not found');
    return category;
  }

  async update(organizationId: string, id: string, dto: UpdateExpenseCategoryDto) {
    await this.findById(organizationId, id);

    return this.prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }
}
