import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScheduleInterviewDto } from '../dto/schedule-interview.dto';
import { RescheduleInterviewDto } from '../dto/reschedule-interview.dto';
import { CancelInterviewDto } from '../dto/cancel-interview.dto';
import { SubmitFeedbackDto } from '../dto/submit-feedback.dto';
import { NotificationEvents } from '../../notification/events/event-types';

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Schedule ───────────────────────────

  async schedule(
    userId: string,
    organizationId: string,
    dto: ScheduleInterviewDto,
  ) {
    const scheduler = await this.prisma.employee.findFirst({
      where: { userId, organizationId, isActive: true },
    });
    if (!scheduler) {
      throw new NotFoundException(
        'No active employee profile linked to your user account',
      );
    }

    const application = await this.prisma.jobApplication.findFirst({
      where: { id: dto.applicationId, organizationId },
      include: {
        candidate: { select: { firstName: true, lastName: true } },
        jobRequisition: { select: { title: true } },
      },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (['HIRED', 'REJECTED', 'WITHDRAWN'].includes(application.status)) {
      throw new BadRequestException(
        `Cannot schedule an interview for a ${application.status} application`,
      );
    }

    if (dto.stageId) {
      const stage = await this.prisma.applicationStage.findFirst({
        where: { id: dto.stageId, jobPostingId: application.jobPostingId ?? undefined },
      });
      if (!stage) {
        throw new NotFoundException(
          'Stage not found for this application posting',
        );
      }
    }

    const uniquePanelistIds = [...new Set(dto.panelistEmployeeIds)];
    const panelists = await this.prisma.employee.findMany({
      where: {
        id: { in: uniquePanelistIds },
        organizationId,
        isActive: true,
      },
      select: { id: true },
    });
    if (panelists.length !== uniquePanelistIds.length) {
      throw new BadRequestException(
        'One or more panelists are not active employees in this organization',
      );
    }

    if (
      dto.primaryPanelistEmployeeId &&
      !uniquePanelistIds.includes(dto.primaryPanelistEmployeeId)
    ) {
      throw new BadRequestException(
        'Primary panelist must be one of the panelists',
      );
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Invalid scheduledAt');
    }

    return this.prisma.$transaction(async (tx) => {
      const interview = await tx.interview.create({
        data: {
          organizationId,
          applicationId: dto.applicationId,
          stageId: dto.stageId ?? null,
          scheduledAt,
          durationMinutes: dto.durationMinutes ?? 60,
          type: dto.type,
          mode: dto.mode ?? 'VIDEO',
          location: dto.location ?? null,
          meetingUrl: dto.meetingUrl ?? null,
          status: 'SCHEDULED',
          scheduledByEmployeeId: scheduler.id,
          notes: dto.notes ?? null,
          interviewers: {
            create: uniquePanelistIds.map((employeeId) => ({
              employeeId,
              isPrimary: employeeId === dto.primaryPanelistEmployeeId,
            })),
          },
        },
        include: {
          interviewers: true,
        },
      });

      this.eventEmitter.emit(NotificationEvents.INTERVIEW_SCHEDULED, {
        organizationId,
        actorUserId: userId,
        referenceId: interview.id,
        referenceType: 'Interview',
        recipientEmployeeIds: uniquePanelistIds,
        variables: {
          candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
          title: application.jobRequisition.title,
          scheduledAt: scheduledAt.toISOString(),
          type: interview.type,
          mode: interview.mode,
        },
      });

      return interview;
    });
  }

  // ─── Reschedule ─────────────────────────

  async reschedule(
    userId: string,
    organizationId: string,
    id: string,
    dto: RescheduleInterviewDto,
  ) {
    const interview = await this.prisma.interview.findFirst({
      where: { id, organizationId },
    });
    if (!interview) throw new NotFoundException('Interview not found');

    if (interview.status !== 'SCHEDULED') {
      throw new BadRequestException('Only SCHEDULED interviews can be rescheduled');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Invalid scheduledAt');
    }

    return this.prisma.interview.update({
      where: { id },
      data: {
        scheduledAt,
        ...(dto.durationMinutes !== undefined && {
          durationMinutes: dto.durationMinutes,
        }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.meetingUrl !== undefined && { meetingUrl: dto.meetingUrl }),
        status: 'RESCHEDULED',
        ...(dto.notes && { notes: dto.notes }),
      },
    });
  }

  // ─── Cancel ─────────────────────────────

  async cancel(
    userId: string,
    organizationId: string,
    id: string,
    dto: CancelInterviewDto,
  ) {
    const interview = await this.prisma.interview.findFirst({
      where: { id, organizationId },
      include: {
        application: {
          include: {
            candidate: { select: { firstName: true, lastName: true } },
            jobRequisition: { select: { title: true, hiringManagerId: true } },
          },
        },
        interviewers: true,
      },
    });
    if (!interview) throw new NotFoundException('Interview not found');

    if (['CANCELLED', 'COMPLETED'].includes(interview.status)) {
      throw new BadRequestException(
        `Cannot cancel a ${interview.status} interview`,
      );
    }

    const updateResult = await this.prisma.interview.updateMany({
      where: { id, organizationId, status: { in: ['SCHEDULED', 'RESCHEDULED'] } },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: dto.reason ?? null,
      },
    });
    if (updateResult.count === 0) {
      throw new BadRequestException('Interview status changed, please retry');
    }

    this.eventEmitter.emit(NotificationEvents.INTERVIEW_CANCELLED, {
      organizationId,
      actorUserId: userId,
      referenceId: id,
      referenceType: 'Interview',
      recipientEmployeeIds: interview.interviewers.map((p) => p.employeeId),
      variables: {
        candidateName: `${interview.application.candidate.firstName} ${interview.application.candidate.lastName}`,
        title: interview.application.jobRequisition.title,
        scheduledAt: interview.scheduledAt.toISOString(),
      },
    });

    return this.prisma.interview.findUniqueOrThrow({ where: { id } });
  }

  // ─── Submit feedback ────────────────────

  async submitFeedback(
    userId: string,
    organizationId: string,
    interviewId: string,
    dto: SubmitFeedbackDto,
  ) {
    const panelist = await this.prisma.employee.findFirst({
      where: { userId, organizationId, isActive: true },
    });
    if (!panelist) {
      throw new NotFoundException(
        'No active employee profile linked to your user account',
      );
    }

    const interview = await this.prisma.interview.findFirst({
      where: { id: interviewId, organizationId },
      include: {
        interviewers: true,
        application: {
          include: {
            candidate: { select: { firstName: true, lastName: true } },
            jobRequisition: { select: { title: true, hiringManagerId: true } },
          },
        },
      },
    });
    if (!interview) throw new NotFoundException('Interview not found');

    const isPanelist = interview.interviewers.some(
      (p) => p.employeeId === panelist.id,
    );
    if (!isPanelist) {
      throw new ForbiddenException(
        'Only assigned panelists can submit feedback for this interview',
      );
    }

    if (!['SCHEDULED', 'COMPLETED', 'RESCHEDULED'].includes(interview.status)) {
      throw new BadRequestException(
        'Feedback cannot be submitted for this interview',
      );
    }

    const existing = await this.prisma.interviewFeedback.findFirst({
      where: { interviewId, panelistEmployeeId: panelist.id },
    });

    const record = existing
      ? await this.prisma.interviewFeedback.update({
          where: { id: existing.id },
          data: {
            rating: dto.rating,
            recommendation: dto.recommendation,
            strengths: dto.strengths ?? null,
            weaknesses: dto.weaknesses ?? null,
            comments: dto.comments ?? null,
            submittedAt: new Date(),
          },
        })
      : await this.prisma.interviewFeedback.create({
          data: {
            interviewId,
            panelistEmployeeId: panelist.id,
            rating: dto.rating,
            recommendation: dto.recommendation,
            strengths: dto.strengths ?? null,
            weaknesses: dto.weaknesses ?? null,
            comments: dto.comments ?? null,
          },
        });

    // If all assigned panelists have submitted feedback, mark COMPLETED
    const feedbackCount = await this.prisma.interviewFeedback.count({
      where: { interviewId },
    });
    if (
      feedbackCount >= interview.interviewers.length &&
      interview.status !== 'COMPLETED'
    ) {
      await this.prisma.interview.update({
        where: { id: interviewId },
        data: { status: 'COMPLETED' },
      });
    }

    this.eventEmitter.emit(NotificationEvents.INTERVIEW_FEEDBACK_SUBMITTED, {
      organizationId,
      actorUserId: userId,
      referenceId: interviewId,
      referenceType: 'Interview',
      recipientEmployeeIds: [interview.application.jobRequisition.hiringManagerId],
      variables: {
        candidateName: `${interview.application.candidate.firstName} ${interview.application.candidate.lastName}`,
        panelistName: `${panelist.firstName} ${panelist.lastName}`,
        recommendation: dto.recommendation,
      },
    });

    return record;
  }

  // ─── Queries ────────────────────────────

  async findByApplication(organizationId: string, applicationId: string) {
    const application = await this.prisma.jobApplication.findFirst({
      where: { id: applicationId, organizationId },
      select: { id: true },
    });
    if (!application) throw new NotFoundException('Application not found');

    return this.prisma.interview.findMany({
      where: { applicationId },
      include: {
        interviewers: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        feedback: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const interview = await this.prisma.interview.findFirst({
      where: { id, organizationId },
      include: {
        application: {
          include: {
            candidate: true,
            jobRequisition: { select: { id: true, title: true } },
          },
        },
        stage: true,
        scheduledBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        interviewers: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        feedback: {
          include: {
            panelist: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    return interview;
  }
}
