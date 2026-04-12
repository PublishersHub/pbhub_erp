import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateOfferDto } from '../dto/create-offer.dto';
import { UpdateOfferDto } from '../dto/update-offer.dto';
import {
  RespondOfferDto,
  OfferResponseDecision,
} from '../dto/respond-offer.dto';
import { RescindOfferDto } from '../dto/rescind-offer.dto';
import { NotificationEvents } from '../../notification/events/event-types';

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Create (DRAFT) ─────────────────────

  async create(
    userId: string,
    organizationId: string,
    dto: CreateOfferDto,
  ) {
    const application = await this.prisma.jobApplication.findFirst({
      where: { id: dto.applicationId, organizationId },
    });
    if (!application) throw new NotFoundException('Application not found');

    if (['HIRED', 'REJECTED', 'WITHDRAWN'].includes(application.status)) {
      throw new BadRequestException(
        `Cannot create an offer for a ${application.status} application`,
      );
    }

    // Validate optional FKs
    if (dto.designationId) {
      const d = await this.prisma.designation.findFirst({
        where: { id: dto.designationId, organizationId },
        select: { id: true },
      });
      if (!d) throw new NotFoundException('Designation not found');
    }
    if (dto.departmentId) {
      const d = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, organizationId },
        select: { id: true },
      });
      if (!d) throw new NotFoundException('Department not found');
    }
    if (dto.reportingManagerId) {
      const m = await this.prisma.employee.findFirst({
        where: {
          id: dto.reportingManagerId,
          organizationId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!m) throw new NotFoundException('Reporting manager not found');
    }

    const proposedJoining = new Date(dto.proposedJoiningDate);
    const expires = new Date(dto.expiresAt);
    if (isNaN(proposedJoining.getTime()) || isNaN(expires.getTime())) {
      throw new BadRequestException('Invalid date values');
    }
    if (expires.getTime() < Date.now()) {
      throw new BadRequestException('expiresAt must be in the future');
    }

    // Next version number for this application
    const latest = await this.prisma.offer.findFirst({
      where: { applicationId: dto.applicationId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (latest?.version ?? 0) + 1;

    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const offerNumber = await this.generateOfferNumber(organizationId, tx);

          return tx.offer.create({
            data: {
              organizationId,
              applicationId: dto.applicationId,
              offerNumber,
              version,
              employmentType: dto.employmentType,
              designationId: dto.designationId ?? null,
              departmentId: dto.departmentId ?? null,
              reportingManagerId: dto.reportingManagerId ?? null,
              baseSalary: new Prisma.Decimal(dto.baseSalary),
              joiningBonus:
                dto.joiningBonus !== undefined
                  ? new Prisma.Decimal(dto.joiningBonus)
                  : null,
              currency: dto.currency ?? 'USD',
              proposedJoiningDate: proposedJoining,
              expiresAt: expires,
              offerLetterUrl: dto.offerLetterUrl ?? null,
              offerLetterFileName: dto.offerLetterFileName ?? null,
              status: 'DRAFT',
              notes: dto.notes ?? null,
            },
          });
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < MAX_RETRIES - 1
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new BadRequestException('Failed to generate unique offer number');
  }

  // ─── Update (DRAFT only) ────────────────

  async update(organizationId: string, id: string, dto: UpdateOfferDto) {
    const offer = await this.prisma.offer.findFirst({
      where: { id, organizationId },
    });
    if (!offer) throw new NotFoundException('Offer not found');

    if (offer.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT offers can be edited');
    }

    return this.prisma.offer.update({
      where: { id },
      data: {
        ...(dto.employmentType !== undefined && {
          employmentType: dto.employmentType,
        }),
        ...(dto.designationId !== undefined && { designationId: dto.designationId }),
        ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
        ...(dto.reportingManagerId !== undefined && {
          reportingManagerId: dto.reportingManagerId,
        }),
        ...(dto.baseSalary !== undefined && {
          baseSalary: new Prisma.Decimal(dto.baseSalary),
        }),
        ...(dto.joiningBonus !== undefined && {
          joiningBonus: new Prisma.Decimal(dto.joiningBonus),
        }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.proposedJoiningDate !== undefined && {
          proposedJoiningDate: new Date(dto.proposedJoiningDate),
        }),
        ...(dto.expiresAt !== undefined && {
          expiresAt: new Date(dto.expiresAt),
        }),
        ...(dto.offerLetterUrl !== undefined && { offerLetterUrl: dto.offerLetterUrl }),
        ...(dto.offerLetterFileName !== undefined && {
          offerLetterFileName: dto.offerLetterFileName,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  // ─── Extend (DRAFT → EXTENDED) ──────────

  async extend(userId: string, organizationId: string, id: string) {
    const extender = await this.prisma.employee.findFirst({
      where: { userId, organizationId, isActive: true },
    });
    if (!extender) {
      throw new NotFoundException(
        'No active employee profile linked to your user account',
      );
    }

    const offer = await this.prisma.offer.findFirst({
      where: { id, organizationId },
      include: {
        application: {
          include: {
            candidate: { select: { firstName: true, lastName: true } },
            jobRequisition: { select: { title: true } },
          },
        },
      },
    });
    if (!offer) throw new NotFoundException('Offer not found');

    if (offer.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT offers can be extended');
    }

    if (offer.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Cannot extend an expired offer');
    }

    // Enforce: at most one active (DRAFT/EXTENDED/ACCEPTED) offer per application.
    // This is backed by the partial unique index — but we guard here to return a
    // clean 400 instead of a 500 on the unique violation.
    const activeConflict = await this.prisma.offer.findFirst({
      where: {
        applicationId: offer.applicationId,
        id: { not: offer.id },
        status: { in: ['DRAFT', 'EXTENDED', 'ACCEPTED'] },
      },
    });
    if (activeConflict) {
      throw new BadRequestException(
        'Another active offer already exists for this application',
      );
    }

    const updateResult = await this.prisma.offer.updateMany({
      where: { id, organizationId, status: 'DRAFT' },
      data: {
        status: 'EXTENDED',
        extendedAt: new Date(),
        extendedByEmployeeId: extender.id,
      },
    });
    if (updateResult.count === 0) {
      throw new BadRequestException('Offer status changed, please retry');
    }

    // Mark the application as OFFER_EXTENDED
    await this.prisma.jobApplication.updateMany({
      where: {
        id: offer.applicationId,
        organizationId,
        status: { notIn: ['HIRED', 'REJECTED', 'WITHDRAWN'] },
      },
      data: { status: 'OFFER_EXTENDED' },
    });

    this.eventEmitter.emit(NotificationEvents.OFFER_EXTENDED, {
      organizationId,
      actorUserId: userId,
      referenceId: id,
      referenceType: 'Offer',
      variables: {
        candidateName: `${offer.application.candidate.firstName} ${offer.application.candidate.lastName}`,
        title: offer.application.jobRequisition.title,
        offerNumber: offer.offerNumber,
      },
    });

    return this.prisma.offer.findUniqueOrThrow({ where: { id } });
  }

  // ─── Respond (EXTENDED → ACCEPTED / DECLINED) ──

  async respond(
    userId: string,
    organizationId: string,
    id: string,
    dto: RespondOfferDto,
  ) {
    const offer = await this.prisma.offer.findFirst({
      where: { id, organizationId },
      include: {
        application: {
          include: {
            candidate: { select: { firstName: true, lastName: true } },
            jobRequisition: { select: { title: true, hiringManagerId: true } },
          },
        },
      },
    });
    if (!offer) throw new NotFoundException('Offer not found');

    if (offer.status !== 'EXTENDED') {
      throw new BadRequestException(
        'Only EXTENDED offers can receive a response',
      );
    }
    if (offer.expiresAt.getTime() < Date.now()) {
      // Auto-expire
      await this.prisma.offer.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Offer has expired');
    }

    const newStatus =
      dto.decision === OfferResponseDecision.ACCEPTED ? 'ACCEPTED' : 'DECLINED';

    const updateResult = await this.prisma.offer.updateMany({
      where: { id, organizationId, status: 'EXTENDED' },
      data: {
        status: newStatus,
        respondedAt: new Date(),
        declineReason:
          dto.decision === OfferResponseDecision.DECLINED
            ? dto.declineReason ?? null
            : null,
      },
    });
    if (updateResult.count === 0) {
      throw new BadRequestException('Offer status changed, please retry');
    }

    this.eventEmitter.emit(NotificationEvents.OFFER_RESPONDED, {
      organizationId,
      actorUserId: userId,
      referenceId: id,
      referenceType: 'Offer',
      recipientEmployeeIds: [offer.application.jobRequisition.hiringManagerId],
      variables: {
        candidateName: `${offer.application.candidate.firstName} ${offer.application.candidate.lastName}`,
        title: offer.application.jobRequisition.title,
        offerNumber: offer.offerNumber,
        decision: newStatus === 'ACCEPTED' ? 'accepted' : 'declined',
      },
    });

    return this.prisma.offer.findUniqueOrThrow({ where: { id } });
  }

  // ─── Rescind ────────────────────────────

  async rescind(
    userId: string,
    organizationId: string,
    id: string,
    dto: RescindOfferDto,
  ) {
    const rescinder = await this.prisma.employee.findFirst({
      where: { userId, organizationId, isActive: true },
    });
    if (!rescinder) {
      throw new NotFoundException(
        'No active employee profile linked to your user account',
      );
    }

    const offer = await this.prisma.offer.findFirst({
      where: { id, organizationId },
    });
    if (!offer) throw new NotFoundException('Offer not found');

    if (!['DRAFT', 'EXTENDED', 'ACCEPTED'].includes(offer.status)) {
      throw new BadRequestException(
        `Cannot rescind a ${offer.status} offer`,
      );
    }

    return this.prisma.offer.update({
      where: { id },
      data: {
        status: 'RESCINDED',
        rescindedAt: new Date(),
        rescindedByEmployeeId: rescinder.id,
        rescindReason: dto.reason ?? null,
      },
    });
  }

  // ─── Queries ────────────────────────────

  async findByApplication(organizationId: string, applicationId: string) {
    const app = await this.prisma.jobApplication.findFirst({
      where: { id: applicationId, organizationId },
      select: { id: true },
    });
    if (!app) throw new NotFoundException('Application not found');

    return this.prisma.offer.findMany({
      where: { applicationId },
      orderBy: [{ version: 'desc' }],
    });
  }

  async findById(organizationId: string, id: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { id, organizationId },
      include: {
        application: {
          include: {
            candidate: true,
            jobRequisition: {
              select: { id: true, requisitionNumber: true, title: true },
            },
          },
        },
        designation: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        reportingManager: {
          select: { id: true, firstName: true, lastName: true },
        },
        extendedBy: { select: { id: true, firstName: true, lastName: true } },
        rescindedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }

  // ─── Helpers ────────────────────────────

  private async generateOfferNumber(
    organizationId: string,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `OFF-${year}-`;

    const latest = await tx.offer.findFirst({
      where: { organizationId, offerNumber: { startsWith: prefix } },
      orderBy: { offerNumber: 'desc' },
      select: { offerNumber: true },
    });

    let nextSeq = 1;
    if (latest) {
      const lastSeq = parseInt(latest.offerNumber.replace(prefix, ''), 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }
}
