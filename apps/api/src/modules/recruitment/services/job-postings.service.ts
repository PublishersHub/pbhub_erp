import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateJobPostingDto } from '../dto/create-job-posting.dto';
import { UpdateJobPostingDto } from '../dto/update-job-posting.dto';
import { NotificationEvents } from '../../notification/events/event-types';

/**
 * Default pipeline applied to every new posting. Includes explicit
 * terminal rows (Hired / Rejected) so `toStage.isHired` / `toStage.isRejected`
 * checks in the stage-movement logic always reference real rows.
 */
const DEFAULT_STAGES = [
  { name: 'Applied', slug: 'applied', sortOrder: 0, isTerminal: false, isHired: false, isRejected: false },
  { name: 'Screen', slug: 'screen', sortOrder: 1, isTerminal: false, isHired: false, isRejected: false },
  { name: 'Interview', slug: 'interview', sortOrder: 2, isTerminal: false, isHired: false, isRejected: false },
  { name: 'Offer', slug: 'offer', sortOrder: 3, isTerminal: false, isHired: false, isRejected: false },
  { name: 'Hired', slug: 'hired', sortOrder: 4, isTerminal: true, isHired: true, isRejected: false },
  { name: 'Rejected', slug: 'rejected', sortOrder: 5, isTerminal: true, isHired: false, isRejected: true },
];

@Injectable()
export class JobPostingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    userId: string,
    organizationId: string,
    dto: CreateJobPostingDto,
  ) {
    const req = await this.prisma.jobRequisition.findFirst({
      where: { id: dto.jobRequisitionId, organizationId },
    });
    if (!req) throw new NotFoundException('Requisition not found');
    if (!['APPROVED', 'OPEN'].includes(req.status)) {
      throw new BadRequestException(
        'Requisition must be APPROVED or OPEN before a posting can be created',
      );
    }

    // Unique org-scoped slug
    const slugConflict = await this.prisma.jobPosting.findFirst({
      where: { organizationId, slug: dto.slug },
    });
    if (slugConflict) {
      throw new BadRequestException('A posting with this slug already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const posting = await tx.jobPosting.create({
        data: {
          organizationId,
          jobRequisitionId: dto.jobRequisitionId,
          title: dto.title,
          slug: dto.slug,
          channel: dto.channel,
          description: dto.description,
          isInternal: dto.isInternal ?? false,
          status: 'DRAFT',
        },
      });

      // Seed default pipeline stages
      await tx.applicationStage.createMany({
        data: DEFAULT_STAGES.map((s) => ({
          organizationId,
          jobPostingId: posting.id,
          name: s.name,
          slug: s.slug,
          sortOrder: s.sortOrder,
          isTerminal: s.isTerminal,
          isHired: s.isHired,
          isRejected: s.isRejected,
        })),
      });

      return posting;
    });
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateJobPostingDto,
  ) {
    const posting = await this.prisma.jobPosting.findFirst({
      where: { id, organizationId },
    });
    if (!posting) throw new NotFoundException('Job posting not found');

    if (posting.status === 'CLOSED') {
      throw new BadRequestException('Closed postings cannot be edited');
    }

    if (dto.slug && dto.slug !== posting.slug) {
      const conflict = await this.prisma.jobPosting.findFirst({
        where: { organizationId, slug: dto.slug, id: { not: id } },
      });
      if (conflict) {
        throw new BadRequestException('A posting with this slug already exists');
      }
    }

    return this.prisma.jobPosting.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.channel !== undefined && { channel: dto.channel }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isInternal !== undefined && { isInternal: dto.isInternal }),
      },
    });
  }

  async publish(userId: string, organizationId: string, id: string) {
    const posting = await this.prisma.jobPosting.findFirst({
      where: { id, organizationId },
      include: { jobRequisition: { select: { status: true, title: true } } },
    });
    if (!posting) throw new NotFoundException('Job posting not found');

    if (posting.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT postings can be published');
    }
    if (!['APPROVED', 'OPEN'].includes(posting.jobRequisition.status)) {
      throw new BadRequestException(
        'Requisition must be APPROVED or OPEN before publishing',
      );
    }

    // Ensure at least one non-terminal stage exists
    const nonTerminalCount = await this.prisma.applicationStage.count({
      where: { jobPostingId: id, isTerminal: false },
    });
    if (nonTerminalCount === 0) {
      throw new BadRequestException(
        'Posting must have at least one non-terminal stage before publishing',
      );
    }

    const updateResult = await this.prisma.jobPosting.updateMany({
      where: { id, organizationId, status: 'DRAFT' },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    if (updateResult.count === 0) {
      throw new BadRequestException('Posting status changed, please retry');
    }

    const updated = await this.prisma.jobPosting.findUniqueOrThrow({
      where: { id },
    });

    this.eventEmitter.emit(NotificationEvents.POSTING_PUBLISHED, {
      organizationId,
      actorUserId: userId,
      referenceId: id,
      referenceType: 'JobPosting',
      variables: {
        title: updated.title,
        channel: updated.channel,
      },
    });

    return updated;
  }

  async close(organizationId: string, id: string) {
    const posting = await this.prisma.jobPosting.findFirst({
      where: { id, organizationId },
    });
    if (!posting) throw new NotFoundException('Job posting not found');
    if (posting.status === 'CLOSED') {
      throw new BadRequestException('Posting is already closed');
    }

    return this.prisma.jobPosting.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  async findAll(organizationId: string, requisitionId?: string) {
    return this.prisma.jobPosting.findMany({
      where: {
        organizationId,
        ...(requisitionId && { jobRequisitionId: requisitionId }),
      },
      include: {
        jobRequisition: {
          select: {
            id: true,
            requisitionNumber: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const posting = await this.prisma.jobPosting.findFirst({
      where: { id, organizationId },
      include: {
        jobRequisition: {
          select: {
            id: true,
            requisitionNumber: true,
            title: true,
            status: true,
            hiringManagerId: true,
          },
        },
        stages: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!posting) throw new NotFoundException('Job posting not found');
    return posting;
  }
}
