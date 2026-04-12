import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateExpensePolicyDto } from '../dto/create-expense-policy.dto';
import { UpdateExpensePolicyDto } from '../dto/update-expense-policy.dto';

@Injectable()
export class ExpensePoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateExpensePolicyDto) {
    const existing = await this.prisma.expensePolicy.findUnique({
      where: { organizationId_name: { organizationId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(`Policy name "${dto.name}" already exists`);
    }

    return this.prisma.expensePolicy.create({
      data: {
        organizationId,
        name: dto.name,
        maxClaimAmount: dto.maxClaimAmount != null ? new Prisma.Decimal(dto.maxClaimAmount) : null,
        maxItemAmount: dto.maxItemAmount != null ? new Prisma.Decimal(dto.maxItemAmount) : null,
        receiptRequiredAbove: dto.receiptRequiredAbove != null ? new Prisma.Decimal(dto.receiptRequiredAbove) : null,
        autoApproveBelow: dto.autoApproveBelow != null ? new Prisma.Decimal(dto.autoApproveBelow) : null,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.expensePolicy.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const policy = await this.prisma.expensePolicy.findFirst({
      where: { id, organizationId },
    });
    if (!policy) throw new NotFoundException('Expense policy not found');
    return policy;
  }

  async update(organizationId: string, id: string, dto: UpdateExpensePolicyDto) {
    await this.findById(organizationId, id);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.maxClaimAmount !== undefined) data.maxClaimAmount = dto.maxClaimAmount != null ? new Prisma.Decimal(dto.maxClaimAmount) : null;
    if (dto.maxItemAmount !== undefined) data.maxItemAmount = dto.maxItemAmount != null ? new Prisma.Decimal(dto.maxItemAmount) : null;
    if (dto.receiptRequiredAbove !== undefined) data.receiptRequiredAbove = dto.receiptRequiredAbove != null ? new Prisma.Decimal(dto.receiptRequiredAbove) : null;
    if (dto.autoApproveBelow !== undefined) data.autoApproveBelow = dto.autoApproveBelow != null ? new Prisma.Decimal(dto.autoApproveBelow) : null;

    return this.prisma.expensePolicy.update({
      where: { id },
      data,
    });
  }
}
