import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { MoveStageDto } from '../dto/move-stage.dto';
import { RejectApplicationDto } from '../dto/reject-application.dto';
import { WithdrawApplicationDto } from '../dto/withdraw-application.dto';
import { NotificationEvents } from '../../notification/events/event-types';

@Injectable()
export class JobApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Create application ─────────────────

  async create(
    userId: string,
    organizationId: string,
    dto: CreateApplicationDto,
  ) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: dto.candidateId, organizationId },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    if (candidate.isBlacklisted) {
      throw new BadRequestException('Cannot apply as blacklisted candidate');
    }

    const req = await this.prisma.jobRequisition.findFirst({
      where: { id: dto.jobRequisitionId, organizationId },
    });
    if (!req) throw new NotFoundException('Requisition not found');
    if (!['APPROVED', 'OPEN'].includes(req.status)) {
      throw new BadRequestException('Requisition is not open for applications');
    }

    if (dto.jobPostingId) {
      const posting = await this.prisma.jobPosting.findFirst({
        where: {
          id: dto.jobPostingId,
          organizationId,
          jobRequisitionId: dto.jobRequisitionId,
        },
      });
      if (!posting) {
        throw new NotFoundException(
          'Job posting not found or does not belong to the requisition',
        );
      }
      if (posting.status !== 'PUBLISHED') {
        throw new BadRequestException(
          'Applications can only be created against PUBLISHED postings',
        );
      }
    }

    // Uniqueness: one application per (candidate, requisition)
    const existing = await this.prisma.jobApplication.findFirst({
      where: {
        candidateId: dto.candidateId,
        jobRequisitionId: dto.jobRequisitionId,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'This candidate already has an application for the requisition',
      );
    }

    // Resolve initial stage — the lowest-order non-terminal stage of the posting
    let currentStageId: string | null = null;
    if (dto.jobPostingId) {
      const firstStage = await this.prisma.applicationStage.findFirst({
        where: { jobPostingId: dto.jobPostingId, isTerminal: false },
        orderBy: { sortOrder: 'asc' },
      });
      if (firstStage) currentStageId = firstStage.id;
    }

    if (dto.referrerEmployeeId) {
      const referrer = await this.prisma.employee.findFirst({
        where: { id: dto.referrerEmployeeId, organizationId, isActive: true },
        select: { id: true },
      });
      if (!referrer) throw new NotFoundException('Referrer not found');
    }

    const actor = await this.prisma.employee.findFirst({
      where: { userId, organizationId, isActive: true },
      select: { id: true },
    });
    // Actor may be null for system/admin contexts — stage history requires
    // an employee, so block creation without an employee identity.
    if (!actor) {
      throw new BadRequestException(
        'No active employee profile linked to your user account',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const application = await tx.jobApplication.create({
        data: {
          organizationId,
          candidateId: dto.candidateId,
          jobRequisitionId: dto.jobRequisitionId,
          jobPostingId: dto.jobPostingId ?? null,
          currentStageId,
          status: 'APPLIED',
          source: dto.source ?? 'OTHER',
          referrerEmployeeId: dto.referrerEmployeeId ?? null,
          coverLetter: dto.coverLetter ?? null,
          resumeUrl: dto.resumeUrl ?? null,
          resumeFileName: dto.resumeFileName ?? null,
          expectedSalary:
            dto.expectedSalary !== undefined
              ? new Prisma.Decimal(dto.expectedSalary)
              : null,
        },
      });

      if (currentStageId) {
        await tx.applicationStageHistory.create({
          data: {
            applicationId: application.id,
            fromStageId: null,
            toStageId: currentStageId,
            movedByEmployeeId: actor.id,
            notes: 'Application created',
          },
        });
      }

      this.eventEmitter.emit(NotificationEvents.APPLICATION_RECEIVED, {
        organizationId,
        actorUserId: userId,
        referenceId: application.id,
        referenceType: 'JobApplication',
        recipientEmployeeIds: [req.hiringManagerId],
        variables: {
          candidateName: `${candidate.firstName} ${candidate.lastName}`,
          title: req.title,
          source: application.source,
        },
      });

      return application;
    });
  }

  // ─── Move stage ─────────────────────────

  async moveStage(
    userId: string,
    organizationId: string,
    applicationId: string,
    dto: MoveStageDto,
  ) {
    const actor = await this.prisma.employee.findFirst({
      where: { userId, organizationId, isActive: true },
    });
    if (!actor) {
      throw new NotFoundException(
        'No active employee profile linked to your user account',
      );
    }

    const application = await this.prisma.jobApplication.findFirst({
      where: { id: applicationId, organizationId },
      include: {
        candidate: { select: { firstName: true, lastName: true } },
        jobRequisition: { select: { title: true, hiringManagerId: true } },
        currentStage: true,
      },
    });
    if (!application) throw new NotFoundException('Application not found');

    if (['HIRED', 'REJECTED', 'WITHDRAWN'].includes(application.status)) {
      throw new BadRequestException(
        `Cannot move a ${application.status} application`,
      );
    }

    const toStage = await this.prisma.applicationStage.findFirst({
      where: { id: dto.toStageId, jobPostingId: application.jobPostingId ?? undefined },
    });
    if (!toStage) {
      throw new NotFoundException(
        'Target stage not found for this application posting',
      );
    }

    if (toStage.id === application.currentStageId) {
      throw new BadRequestException('Application is already in this stage');
    }

    // isHired / isRejected stages must be reached via dedicated endpoints
    if (toStage.isHired) {
      throw new BadRequestException(
        'Use the hire endpoint to move to a hired stage',
      );
    }
    if (toStage.isRejected) {
      throw new BadRequestException(
        'Use the reject endpoint to move to a rejected stage',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.jobApplication.updateMany({
        where: {
          id: applicationId,
          organizationId,
          currentStageId: application.currentStageId,
        },
        data: {
          currentStageId: toStage.id,
          status: 'IN_PROGRESS',
        },
      });
      if (updateResult.count === 0) {
        throw new BadRequestException(
          'Application stage changed, please retry',
        );
      }

      await tx.applicationStageHistory.create({
        data: {
          applicationId,
          fromStageId: application.currentStageId,
          toStageId: toStage.id,
          movedByEmployeeId: actor.id,
          notes: dto.notes ?? null,
        },
      });

      this.eventEmitter.emit(NotificationEvents.APPLICATION_STAGE_CHANGED, {
        organizationId,
        actorUserId: userId,
        referenceId: applicationId,
        referenceType: 'JobApplication',
        recipientEmployeeIds: [application.jobRequisition.hiringManagerId],
        variables: {
          candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
          title: application.jobRequisition.title,
          fromStage: application.currentStage?.name ?? '-',
          toStage: toStage.name,
        },
      });

      return tx.jobApplication.findUniqueOrThrow({ where: { id: applicationId } });
    });
  }

  // ─── Reject ─────────────────────────────

  async reject(
    userId: string,
    organizationId: string,
    applicationId: string,
    dto: RejectApplicationDto,
  ) {
    const actor = await this.prisma.employee.findFirst({
      where: { userId, organizationId, isActive: true },
    });
    if (!actor) {
      throw new NotFoundException(
        'No active employee profile linked to your user account',
      );
    }

    const application = await this.prisma.jobApplication.findFirst({
      where: { id: applicationId, organizationId },
      include: {
        candidate: { select: { firstName: true, lastName: true } },
        jobRequisition: { select: { title: true, hiringManagerId: true } },
      },
    });
    if (!application) throw new NotFoundException('Application not found');

    if (['HIRED', 'REJECTED', 'WITHDRAWN'].includes(application.status)) {
      throw new BadRequestException(
        `Cannot reject a ${application.status} application`,
      );
    }

    // Find the canonical rejected stage for this posting (if any)
    let rejectedStageId: string | null = null;
    if (application.jobPostingId) {
      const rejectedStage = await this.prisma.applicationStage.findFirst({
        where: { jobPostingId: application.jobPostingId, isRejected: true },
      });
      if (rejectedStage) rejectedStageId = rejectedStage.id;
    }

    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.jobApplication.updateMany({
        where: {
          id: applicationId,
          organizationId,
          status: { notIn: ['HIRED', 'REJECTED', 'WITHDRAWN'] },
        },
        data: {
          status: 'REJECTED',
          rejectionReason: dto.reason,
          rejectionNotes: dto.notes ?? null,
          rejectedAt: new Date(),
          rejectedByEmployeeId: actor.id,
          ...(rejectedStageId && { currentStageId: rejectedStageId }),
        },
      });
      if (updateResult.count === 0) {
        throw new BadRequestException('Application status changed, please retry');
      }

      if (rejectedStageId) {
        await tx.applicationStageHistory.create({
          data: {
            applicationId,
            fromStageId: application.currentStageId,
            toStageId: rejectedStageId,
            movedByEmployeeId: actor.id,
            notes: `Rejected: ${dto.reason}${dto.notes ? ` — ${dto.notes}` : ''}`,
          },
        });
      }

      this.eventEmitter.emit(NotificationEvents.APPLICATION_REJECTED, {
        organizationId,
        actorUserId: userId,
        referenceId: applicationId,
        referenceType: 'JobApplication',
        recipientEmployeeIds: [application.jobRequisition.hiringManagerId],
        variables: {
          candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
          title: application.jobRequisition.title,
          reason: dto.reason,
        },
      });

      return tx.jobApplication.findUniqueOrThrow({ where: { id: applicationId } });
    });
  }

  // ─── Withdraw ───────────────────────────

  async withdraw(
    userId: string,
    organizationId: string,
    applicationId: string,
    dto: WithdrawApplicationDto,
  ) {
    const application = await this.prisma.jobApplication.findFirst({
      where: { id: applicationId, organizationId },
      include: {
        candidate: { select: { firstName: true, lastName: true } },
        jobRequisition: { select: { title: true, hiringManagerId: true } },
      },
    });
    if (!application) throw new NotFoundException('Application not found');

    if (['HIRED', 'REJECTED', 'WITHDRAWN'].includes(application.status)) {
      throw new BadRequestException(
        `Cannot withdraw a ${application.status} application`,
      );
    }

    const updateResult = await this.prisma.jobApplication.updateMany({
      where: {
        id: applicationId,
        organizationId,
        status: { notIn: ['HIRED', 'REJECTED', 'WITHDRAWN'] },
      },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt: new Date(),
        withdrawnReason: dto.reason ?? null,
      },
    });
    if (updateResult.count === 0) {
      throw new BadRequestException('Application status changed, please retry');
    }

    this.eventEmitter.emit(NotificationEvents.APPLICATION_WITHDRAWN, {
      organizationId,
      actorUserId: userId,
      referenceId: applicationId,
      referenceType: 'JobApplication',
      recipientEmployeeIds: [application.jobRequisition.hiringManagerId],
      variables: {
        candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
        title: application.jobRequisition.title,
      },
    });

    return this.prisma.jobApplication.findUniqueOrThrow({
      where: { id: applicationId },
    });
  }

  // ─── Queries ────────────────────────────

  async findAll(
    organizationId: string,
    filters: {
      requisitionId?: string;
      postingId?: string;
      candidateId?: string;
      status?: string;
    },
  ) {
    return this.prisma.jobApplication.findMany({
      where: {
        organizationId,
        ...(filters.requisitionId && { jobRequisitionId: filters.requisitionId }),
        ...(filters.postingId && { jobPostingId: filters.postingId }),
        ...(filters.candidateId && { candidateId: filters.candidateId }),
        ...(filters.status && { status: filters.status as any }),
      },
      include: {
        candidate: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        jobRequisition: {
          select: { id: true, requisitionNumber: true, title: true },
        },
        jobPosting: { select: { id: true, title: true } },
        currentStage: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const application = await this.prisma.jobApplication.findFirst({
      where: { id, organizationId },
      include: {
        candidate: true,
        jobRequisition: {
          select: {
            id: true,
            requisitionNumber: true,
            title: true,
            hiringManagerId: true,
          },
        },
        jobPosting: {
          select: { id: true, title: true, status: true },
        },
        currentStage: true,
        referrer: { select: { id: true, firstName: true, lastName: true } },
        rejectedBy: { select: { id: true, firstName: true, lastName: true } },
        hiredEmployee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        stageHistory: {
          include: {
            toStage: { select: { id: true, name: true } },
            movedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        interviews: {
          include: {
            interviewers: {
              include: {
                employee: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
          orderBy: { scheduledAt: 'desc' },
        },
        offers: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!application) throw new NotFoundException('Application not found');
    return application;
  }
}
