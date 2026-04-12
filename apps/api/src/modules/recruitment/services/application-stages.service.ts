import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateApplicationStageDto } from '../dto/create-application-stage.dto';
import { UpdateApplicationStageDto } from '../dto/update-application-stage.dto';
import { ReorderStagesDto } from '../dto/reorder-stages.dto';

@Injectable()
export class ApplicationStagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    jobPostingId: string,
    dto: CreateApplicationStageDto,
  ) {
    const posting = await this.prisma.jobPosting.findFirst({
      where: { id: jobPostingId, organizationId },
    });
    if (!posting) throw new NotFoundException('Job posting not found');

    if (posting.status === 'CLOSED') {
      throw new BadRequestException('Cannot add stages to a closed posting');
    }

    // Slug must be unique per posting
    const slugConflict = await this.prisma.applicationStage.findFirst({
      where: { jobPostingId, slug: dto.slug },
    });
    if (slugConflict) {
      throw new BadRequestException('A stage with this slug already exists');
    }

    // sortOrder must be unique per posting — shift higher stages if needed
    return this.prisma.$transaction(async (tx) => {
      await tx.applicationStage.updateMany({
        where: { jobPostingId, sortOrder: { gte: dto.sortOrder } },
        data: { sortOrder: { increment: 1 } },
      });

      return tx.applicationStage.create({
        data: {
          organizationId,
          jobPostingId,
          name: dto.name,
          slug: dto.slug,
          sortOrder: dto.sortOrder,
          isTerminal: dto.isTerminal ?? false,
          isHired: dto.isHired ?? false,
          isRejected: dto.isRejected ?? false,
        },
      });
    });
  }

  async update(
    organizationId: string,
    stageId: string,
    dto: UpdateApplicationStageDto,
  ) {
    const stage = await this.prisma.applicationStage.findFirst({
      where: { id: stageId, organizationId },
    });
    if (!stage) throw new NotFoundException('Stage not found');

    if (dto.slug && dto.slug !== stage.slug) {
      const conflict = await this.prisma.applicationStage.findFirst({
        where: {
          jobPostingId: stage.jobPostingId,
          slug: dto.slug,
          id: { not: stageId },
        },
      });
      if (conflict) {
        throw new BadRequestException('A stage with this slug already exists');
      }
    }

    // sortOrder changes should go through reorder endpoint for correctness
    if (dto.sortOrder !== undefined && dto.sortOrder !== stage.sortOrder) {
      throw new BadRequestException(
        'Use the reorder endpoint to change sortOrder',
      );
    }

    return this.prisma.applicationStage.update({
      where: { id: stageId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.isTerminal !== undefined && { isTerminal: dto.isTerminal }),
        ...(dto.isHired !== undefined && { isHired: dto.isHired }),
        ...(dto.isRejected !== undefined && { isRejected: dto.isRejected }),
      },
    });
  }

  async delete(organizationId: string, stageId: string) {
    const stage = await this.prisma.applicationStage.findFirst({
      where: { id: stageId, organizationId },
    });
    if (!stage) throw new NotFoundException('Stage not found');

    // Block delete if any application currently sits at this stage
    const inUse = await this.prisma.jobApplication.count({
      where: { currentStageId: stageId },
    });
    if (inUse > 0) {
      throw new BadRequestException(
        'Cannot delete a stage that has active applications',
      );
    }

    // Block delete of terminal/hired/rejected stages — they anchor workflow logic
    if (stage.isHired || stage.isRejected) {
      throw new BadRequestException(
        'Cannot delete terminal hired/rejected stages',
      );
    }

    return this.prisma.applicationStage.delete({ where: { id: stageId } });
  }

  async reorder(
    organizationId: string,
    jobPostingId: string,
    dto: ReorderStagesDto,
  ) {
    const posting = await this.prisma.jobPosting.findFirst({
      where: { id: jobPostingId, organizationId },
    });
    if (!posting) throw new NotFoundException('Job posting not found');

    const stages = await this.prisma.applicationStage.findMany({
      where: { jobPostingId },
      select: { id: true },
    });
    const stageIdSet = new Set(stages.map((s) => s.id));

    if (dto.order.length !== stages.length) {
      throw new BadRequestException(
        'Reorder payload must include every stage of the posting',
      );
    }

    const seenOrders = new Set<number>();
    for (const item of dto.order) {
      if (!stageIdSet.has(item.stageId)) {
        throw new BadRequestException(
          `Stage ${item.stageId} does not belong to this posting`,
        );
      }
      if (seenOrders.has(item.sortOrder)) {
        throw new BadRequestException('Duplicate sortOrder values not allowed');
      }
      seenOrders.add(item.sortOrder);
    }

    // Two-phase update to avoid unique (jobPostingId, sortOrder) violations:
    // phase 1 — push every stage into a "safe" offset range
    // phase 2 — apply the final target positions
    return this.prisma.$transaction(async (tx) => {
      const offset = 10000;
      for (const item of dto.order) {
        await tx.applicationStage.update({
          where: { id: item.stageId },
          data: { sortOrder: item.sortOrder + offset },
        });
      }
      for (const item of dto.order) {
        await tx.applicationStage.update({
          where: { id: item.stageId },
          data: { sortOrder: item.sortOrder },
        });
      }

      return tx.applicationStage.findMany({
        where: { jobPostingId },
        orderBy: { sortOrder: 'asc' },
      });
    });
  }

  async findByPosting(organizationId: string, jobPostingId: string) {
    // Org scoping via join on posting
    const posting = await this.prisma.jobPosting.findFirst({
      where: { id: jobPostingId, organizationId },
      select: { id: true },
    });
    if (!posting) throw new NotFoundException('Job posting not found');

    return this.prisma.applicationStage.findMany({
      where: { jobPostingId },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
