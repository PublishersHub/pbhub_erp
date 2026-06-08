import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { SubmitSelfReviewDto } from '../dto/submit-self-review.dto';
import { SubmitManagerReviewDto } from '../dto/submit-manager-review.dto';
import { CalibrateReviewDto } from '../dto/calibrate-review.dto';
import { NotificationEvents } from '../../notification/events/event-types';

const HR_ROLE_SLUGS = ['hr_admin', 'super_admin'];

@Injectable()
export class PerformanceReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── My review for a cycle ────────────

  async findMyReview(userId: string, organizationId: string, cycleId: string) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const review = await this.prisma.performanceReview.findFirst({
      where: { cycleId, employeeId: employee.id, organizationId },
      include: {
        cycle: { select: { id: true, name: true, year: true, quarter: true, status: true } },
        goalReviews: {
          include: {
            goal: {
              select: {
                id: true, title: true, description: true,
                measurementType: true, targetValue: true, currentValue: true, weight: true,
              },
            },
          },
        },
        reviewerEmployee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!review) throw new NotFoundException('No review found for this cycle');
    return review;
  }

  // ─── Team reviews (manager) ───────────

  async findTeamReviews(userId: string, organizationId: string, cycleId?: string) {
    const manager = await this.findEmployeeByUserId(userId, organizationId);

    const directReports = await this.prisma.employee.findMany({
      where: { reportingManagerId: manager.id, organizationId, isActive: true },
      select: { id: true },
    });

    return this.prisma.performanceReview.findMany({
      where: {
        organizationId,
        employeeId: { in: directReports.map((e) => e.id) },
        ...(cycleId && { cycleId }),
      },
      include: {
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        cycle: { select: { id: true, name: true, year: true, quarter: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── All reviews (admin) ──────────────

  async findAll(organizationId: string, cycleId?: string, employeeId?: string) {
    return this.prisma.performanceReview.findMany({
      where: {
        organizationId,
        ...(cycleId && { cycleId }),
        ...(employeeId && { employeeId }),
      },
      include: {
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        cycle: { select: { id: true, name: true, year: true, quarter: true } },
        reviewerEmployee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Single review ───────────────────

  async findById(
    organizationId: string,
    reviewId: string,
    callerUserId?: string,
    callerPermissions?: string[],
  ) {
    const review = await this.prisma.performanceReview.findFirst({
      where: { id: reviewId, organizationId },
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true, userId: true },
        },
        cycle: { select: { id: true, name: true, year: true, quarter: true, status: true } },
        reviewerEmployee: { select: { id: true, firstName: true, lastName: true, userId: true } },
        calibratedByEmployee: { select: { id: true, firstName: true, lastName: true } },
        goalReviews: {
          include: {
            goal: {
              select: {
                id: true, title: true, description: true,
                measurementType: true, targetValue: true, currentValue: true, weight: true,
              },
            },
          },
        },
      },
    });
    if (!review) throw new NotFoundException('Review not found');

    if (callerUserId && callerPermissions) {
      const isOwner = review.employee?.userId === callerUserId;
      const isReviewer = review.reviewerEmployee?.userId === callerUserId;
      const canReadAll =
        callerPermissions.includes('performance.read') ||
        callerPermissions.includes('performance.manage') ||
        callerPermissions.includes('performance.review');
      if (!isOwner && !isReviewer && !canReadAll) {
        throw new ForbiddenException(
          'You do not have permission to view this performance review',
        );
      }
    }

    return review;
  }

  // ─── Self review (save / submit) ─────

  async submitSelfReview(
    userId: string,
    organizationId: string,
    reviewId: string,
    dto: SubmitSelfReviewDto,
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const review = await this.prisma.performanceReview.findFirst({
      where: { id: reviewId, organizationId, employeeId: employee.id },
      include: {
        cycle: { select: { status: true } },
        goalReviews: true,
      },
    });
    if (!review) throw new NotFoundException('Review not found');

    if (review.cycle.status !== 'SELF_REVIEW') {
      throw new BadRequestException('Self reviews can only be submitted during the self-review phase');
    }

    if (!['NOT_STARTED', 'SELF_REVIEW_IN_PROGRESS'].includes(review.status)) {
      throw new BadRequestException('Self review has already been submitted');
    }

    // Draft save
    if (dto.isDraft) {
      return this.saveDraft(reviewId, dto);
    }

    // Final submission — validate required fields
    if (dto.selfRating === undefined || dto.selfRating === null) {
      throw new BadRequestException('Self rating is required for submission');
    }
    this.validateRating(dto.selfRating);

    if (dto.goalReviews) {
      for (const gr of dto.goalReviews) {
        if (gr.selfRating === undefined || gr.selfRating === null) {
          throw new BadRequestException('Self rating is required for all goals on submission');
        }
        this.validateRating(gr.selfRating);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.goalReviews) {
        for (const gr of dto.goalReviews) {
          await tx.goalReview.update({
            where: { reviewId_goalId: { reviewId, goalId: gr.goalId } },
            data: {
              selfRating: gr.selfRating,
              selfComment: gr.selfComment ?? null,
            },
          });
        }
      }

      return tx.performanceReview.update({
        where: { id: reviewId },
        data: {
          selfComment: dto.selfComment ?? null,
          selfRating: dto.selfRating,
          selfSubmittedAt: new Date(),
          status: 'SELF_REVIEW_SUBMITTED',
        },
        include: {
          goalReviews: {
            include: {
              goal: { select: { id: true, title: true, weight: true } },
            },
          },
        },
      });
    });
  }

  // ─── Manager review (save / submit) ──

  async submitManagerReview(
    userId: string,
    organizationId: string,
    reviewId: string,
    dto: SubmitManagerReviewDto,
    userRoles: string[],
  ) {
    const manager = await this.findEmployeeByUserId(userId, organizationId);

    const review = await this.prisma.performanceReview.findFirst({
      where: { id: reviewId, organizationId },
      include: {
        cycle: { select: { status: true } },
        employee: { select: { reportingManagerId: true } },
        goalReviews: true,
      },
    });
    if (!review) throw new NotFoundException('Review not found');

    if (review.cycle.status !== 'MANAGER_REVIEW') {
      throw new BadRequestException('Manager reviews can only be submitted during the manager-review phase');
    }

    // Authorization: current reporting manager or HR
    const isReportingManager = review.employee.reportingManagerId === manager.id;
    const isHR = userRoles.some((r) => HR_ROLE_SLUGS.includes(r));
    if (!isReportingManager && !isHR) {
      throw new ForbiddenException(
        'Only the reporting manager or HR can submit manager reviews',
      );
    }

    if (!['SELF_REVIEW_SUBMITTED', 'MANAGER_REVIEW_IN_PROGRESS'].includes(review.status)) {
      throw new BadRequestException(
        'Review must have self-review submitted before manager review',
      );
    }

    // Draft save
    if (dto.isDraft) {
      return this.saveManagerDraft(reviewId, manager.id, dto);
    }

    // Final submission — validate
    if (dto.managerRating === undefined || dto.managerRating === null) {
      throw new BadRequestException('Manager rating is required for submission');
    }
    this.validateRating(dto.managerRating);

    if (dto.goalReviews) {
      for (const gr of dto.goalReviews) {
        if (gr.managerRating === undefined || gr.managerRating === null) {
          throw new BadRequestException('Manager rating is required for all goals on submission');
        }
        this.validateRating(gr.managerRating);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.goalReviews) {
        for (const gr of dto.goalReviews) {
          await tx.goalReview.update({
            where: { reviewId_goalId: { reviewId, goalId: gr.goalId } },
            data: {
              managerRating: gr.managerRating,
              managerComment: gr.managerComment ?? null,
            },
          });
        }
      }

      return tx.performanceReview.update({
        where: { id: reviewId },
        data: {
          reviewerEmployeeId: manager.id,
          managerComment: dto.managerComment ?? null,
          managerRating: dto.managerRating,
          managerSubmittedAt: new Date(),
          status: 'MANAGER_REVIEW_SUBMITTED',
        },
        include: {
          goalReviews: {
            include: {
              goal: { select: { id: true, title: true, weight: true } },
            },
          },
        },
      });
    });
  }

  // ─── HR Calibration ──────────────────

  async calibrate(
    userId: string,
    organizationId: string,
    reviewId: string,
    dto: CalibrateReviewDto,
  ) {
    const calibrator = await this.findEmployeeByUserId(userId, organizationId);

    const review = await this.prisma.performanceReview.findFirst({
      where: { id: reviewId, organizationId },
      include: { cycle: { select: { status: true } } },
    });
    if (!review) throw new NotFoundException('Review not found');

    if (review.cycle.status !== 'CALIBRATION') {
      throw new BadRequestException('Calibration is only available during the calibration phase');
    }

    if (review.status !== 'MANAGER_REVIEW_SUBMITTED') {
      throw new BadRequestException('Review must be manager-reviewed before calibration');
    }

    this.validateRating(dto.finalRating);

    const completed = await this.prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        finalRating: dto.finalRating,
        calibrationComment: dto.calibrationComment ?? null,
        calibratedByEmployeeId: calibrator.id,
        calibratedAt: new Date(),
        status: 'COMPLETED',
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        goalReviews: {
          include: {
            goal: { select: { id: true, title: true, weight: true } },
          },
        },
      },
    });

    this.eventEmitter.emit(NotificationEvents.PERFORMANCE_REVIEW_COMPLETED, {
      organizationId,
      actorUserId: userId,
      referenceId: reviewId,
      referenceType: 'PerformanceReview',
      recipientEmployeeIds: [completed.employee.id],
      variables: {
        finalRating: dto.finalRating.toString(),
      },
    });

    return completed;
  }

  // ─── Internal helpers ─────────────────

  private async saveDraft(reviewId: string, dto: SubmitSelfReviewDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.goalReviews) {
        for (const gr of dto.goalReviews) {
          if (gr.selfRating !== undefined) this.validateRating(gr.selfRating);
          await tx.goalReview.update({
            where: { reviewId_goalId: { reviewId, goalId: gr.goalId } },
            data: {
              ...(gr.selfRating !== undefined && { selfRating: gr.selfRating }),
              ...(gr.selfComment !== undefined && { selfComment: gr.selfComment }),
            },
          });
        }
      }

      return tx.performanceReview.update({
        where: { id: reviewId },
        data: {
          ...(dto.selfComment !== undefined && { selfComment: dto.selfComment }),
          ...(dto.selfRating !== undefined && { selfRating: dto.selfRating }),
          status: 'SELF_REVIEW_IN_PROGRESS',
        },
        include: {
          goalReviews: {
            include: {
              goal: { select: { id: true, title: true, weight: true } },
            },
          },
        },
      });
    });
  }

  private async saveManagerDraft(
    reviewId: string,
    managerId: string,
    dto: SubmitManagerReviewDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.goalReviews) {
        for (const gr of dto.goalReviews) {
          if (gr.managerRating !== undefined) this.validateRating(gr.managerRating);
          await tx.goalReview.update({
            where: { reviewId_goalId: { reviewId, goalId: gr.goalId } },
            data: {
              ...(gr.managerRating !== undefined && { managerRating: gr.managerRating }),
              ...(gr.managerComment !== undefined && { managerComment: gr.managerComment }),
            },
          });
        }
      }

      return tx.performanceReview.update({
        where: { id: reviewId },
        data: {
          reviewerEmployeeId: managerId,
          ...(dto.managerComment !== undefined && { managerComment: dto.managerComment }),
          ...(dto.managerRating !== undefined && { managerRating: dto.managerRating }),
          status: 'MANAGER_REVIEW_IN_PROGRESS',
        },
        include: {
          goalReviews: {
            include: {
              goal: { select: { id: true, title: true, weight: true } },
            },
          },
        },
      });
    });
  }

  private validateRating(rating: number) {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1.00 and 5.00');
    }
  }

  private async findEmployeeByUserId(userId: string, organizationId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId, organizationId, isActive: true },
    });
    if (!employee) {
      throw new NotFoundException(
        'No active employee profile linked to your user account',
      );
    }
    return employee;
  }
}
