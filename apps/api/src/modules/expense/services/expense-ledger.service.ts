import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateLedgerEntryDto {
  date: string;
  particular: string;
  debit?: number | string;
  credit?: number | string;
  notes?: string;
}

export interface UpdateLedgerEntryDto extends Partial<CreateLedgerEntryDto> {}

@Injectable()
export class ExpenseLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, from?: string, to?: string) {
    const where: Prisma.ExpenseLedgerEntryWhereInput = { organizationId };
    if (from || to) {
      where.date = {};
      if (from) (where.date as Prisma.DateTimeFilter).gte = this.parseDate(from);
      if (to) (where.date as Prisma.DateTimeFilter).lte = this.parseDate(to);
    }

    const entries = await this.prisma.expenseLedgerEntry.findMany({
      where,
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    // Running balance + totals
    let running = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    const rows = entries.map((e) => {
      const debit = Number(e.debit.toString());
      const credit = Number(e.credit.toString());
      running = running + credit - debit;
      totalDebit += debit;
      totalCredit += credit;
      return {
        id: e.id,
        date: e.date.toISOString().slice(0, 10),
        particular: e.particular,
        debit,
        credit,
        balance: Number(running.toFixed(2)),
        notes: e.notes,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      };
    });

    return {
      rows,
      totals: {
        debit: Number(totalDebit.toFixed(2)),
        credit: Number(totalCredit.toFixed(2)),
        balance: Number(running.toFixed(2)),
      },
    };
  }

  async create(organizationId: string, dto: CreateLedgerEntryDto) {
    const date = this.parseDate(dto.date);
    const debit = this.parseAmount(dto.debit, 'debit');
    const credit = this.parseAmount(dto.credit, 'credit');

    if (debit === 0 && credit === 0) {
      throw new BadRequestException('At least one of debit or credit must be > 0');
    }
    if (!dto.particular?.trim()) {
      throw new BadRequestException('Particular is required');
    }

    return this.prisma.expenseLedgerEntry.create({
      data: {
        organizationId,
        date,
        particular: dto.particular.trim(),
        debit,
        credit,
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateLedgerEntryDto) {
    const existing = await this.prisma.expenseLedgerEntry.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Ledger entry not found');

    const data: Prisma.ExpenseLedgerEntryUpdateInput = {};
    if (dto.date !== undefined) data.date = this.parseDate(dto.date);
    if (dto.particular !== undefined) {
      if (!dto.particular.trim()) {
        throw new BadRequestException('Particular cannot be empty');
      }
      data.particular = dto.particular.trim();
    }
    if (dto.debit !== undefined) data.debit = this.parseAmount(dto.debit, 'debit');
    if (dto.credit !== undefined) data.credit = this.parseAmount(dto.credit, 'credit');
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;

    return this.prisma.expenseLedgerEntry.update({ where: { id }, data });
  }

  async remove(organizationId: string, id: string) {
    const existing = await this.prisma.expenseLedgerEntry.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Ledger entry not found');
    await this.prisma.expenseLedgerEntry.delete({ where: { id } });
    return { ok: true };
  }

  private parseDate(s: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      throw new BadRequestException(`Invalid date "${s}" — expected YYYY-MM-DD`);
    }
    const [y, m, d] = s.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  private parseAmount(value: number | string | undefined, field: string): number {
    if (value === undefined || value === null || value === '') return 0;
    const n = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(n) || n < 0) {
      throw new BadRequestException(`Invalid ${field} — must be a non-negative number`);
    }
    return n;
  }
}
