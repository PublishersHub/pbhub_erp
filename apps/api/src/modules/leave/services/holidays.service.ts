import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateHolidayDto } from '../dto/create-holiday.dto';
import { UpdateHolidayDto } from '../dto/update-holiday.dto';

@Injectable()
export class HolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CRUD ──────────────────────────────

  async create(organizationId: string, dto: CreateHolidayDto) {
    try {
      return await this.prisma.holiday.create({
        data: {
          organizationId,
          name: dto.name,
          date: new Date(dto.date),
          isOptional: dto.isOptional ?? false,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A holiday already exists on this date');
      }
      throw error;
    }
  }

  async findAll(organizationId: string, year?: number) {
    const where: any = { organizationId };
    if (year) {
      const start = new Date(Date.UTC(year, 0, 1));
      const end = new Date(Date.UTC(year, 11, 31));
      where.date = { gte: start, lte: end };
    }

    return this.prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const holiday = await this.prisma.holiday.findFirst({
      where: { id, organizationId },
    });
    if (!holiday) throw new NotFoundException('Holiday not found');
    return holiday;
  }

  async update(organizationId: string, id: string, dto: UpdateHolidayDto) {
    await this.findById(organizationId, id);

    try {
      return await this.prisma.holiday.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.date !== undefined && { date: new Date(dto.date) }),
          ...(dto.isOptional !== undefined && { isOptional: dto.isOptional }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A holiday already exists on this date');
      }
      throw error;
    }
  }

  async deactivate(organizationId: string, id: string) {
    await this.findById(organizationId, id);
    return this.prisma.holiday.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
