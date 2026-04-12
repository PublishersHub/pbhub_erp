import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { HireCandidateDto } from '../dto/hire-candidate.dto';
import { NotificationEvents } from '../../notification/events/event-types';
import { OnboardingInstancesService } from '../../onboarding/services/onboarding-instances.service';

/**
 * The hire flow converts an accepted offer into a new Employee row.
 * It wraps everything in a transaction with 7 concurrency guards:
 *
 *   1. Offer must exist, be org-scoped, and in ACCEPTED status
 *   2. Application must not already be HIRED (via status check)
 *   3. Application.hiredEmployeeId must be null (enforced by @unique)
 *   4. Candidate.convertedEmployeeId must be null (enforced by @unique)
 *   5. Employee code must be unique within org
 *   6. Optional linked user must not already be tied to an employee
 *   7. Concurrent hire attempts lose at the final updateMany with where-clause
 */
@Injectable()
export class HireService {
  private readonly logger = new Logger(HireService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly onboardingInstancesService: OnboardingInstancesService,
  ) {}

  async hire(
    userId: string,
    organizationId: string,
    offerId: string,
    dto: HireCandidateDto,
  ) {
    const offer = await this.prisma.offer.findFirst({
      where: { id: offerId, organizationId },
      include: {
        application: {
          include: {
            candidate: true,
            jobRequisition: true,
          },
        },
      },
    });
    if (!offer) throw new NotFoundException('Offer not found');

    // Guard 1: offer must be ACCEPTED
    if (offer.status !== 'ACCEPTED') {
      throw new BadRequestException(
        'Only ACCEPTED offers can be converted to a hire',
      );
    }

    const application = offer.application;
    const candidate = application.candidate;
    const requisition = application.jobRequisition;

    // Guard 2: application not already hired
    if (application.status === 'HIRED') {
      throw new BadRequestException('Application is already hired');
    }
    if (['REJECTED', 'WITHDRAWN'].includes(application.status)) {
      throw new BadRequestException(
        `Cannot hire a ${application.status} application`,
      );
    }

    // Guard 3: hiredEmployeeId slot must be free (belt + suspenders w/ @unique)
    if (application.hiredEmployeeId) {
      throw new BadRequestException(
        'Application already has a linked employee',
      );
    }

    // Guard 4: candidate not already converted
    if (candidate.convertedEmployeeId) {
      throw new BadRequestException(
        'Candidate has already been converted to an employee',
      );
    }

    // Guard 5: employee code uniqueness within org
    const existingCode = await this.prisma.employee.findFirst({
      where: { organizationId, employeeCode: dto.employeeCode },
    });
    if (existingCode) {
      throw new BadRequestException(
        `Employee code ${dto.employeeCode} is already in use`,
      );
    }

    // Guard 6: optional user must not already be linked to an employee
    if (dto.userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.userId, organizationId, isActive: true },
      });
      if (!user) {
        throw new NotFoundException('Linked user account not found');
      }
      const existingUserEmployee = await this.prisma.employee.findFirst({
        where: { userId: dto.userId },
      });
      if (existingUserEmployee) {
        throw new BadRequestException(
          'This user account is already linked to another employee',
        );
      }
    }

    const joiningDate = new Date(dto.joiningDate);
    if (isNaN(joiningDate.getTime())) {
      throw new BadRequestException('Invalid joiningDate');
    }

    // Find a "Hired" terminal stage on the application's posting (optional)
    let hiredStageId: string | null = null;
    if (application.jobPostingId) {
      const hiredStage = await this.prisma.applicationStage.findFirst({
        where: { jobPostingId: application.jobPostingId, isHired: true },
      });
      if (hiredStage) hiredStageId = hiredStage.id;
    }

    const actor = await this.prisma.employee.findFirst({
      where: { userId, organizationId, isActive: true },
      select: { id: true },
    });
    // Actor may be null if executed by super admin without an employee profile
    // — stage history allows that case only if hiredStageId is null.

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Guard 7 (racy slot claim): atomically set the application's hired flag
        // using updateMany — only succeeds if the application is still unhired.
        const employee = await tx.employee.create({
          data: {
            organizationId,
            userId: dto.userId ?? null,
            employeeCode: dto.employeeCode,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            personalEmail: dto.workEmail ?? candidate.email,
            phone: candidate.phone ?? null,
            departmentId: offer.departmentId ?? requisition.departmentId ?? null,
            designationId:
              offer.designationId ?? requisition.designationId ?? null,
            reportingManagerId:
              offer.reportingManagerId ?? requisition.hiringManagerId ?? null,
            isActive: true,
          },
        });

        // Atomic claim on application row
        const appClaim = await tx.jobApplication.updateMany({
          where: {
            id: application.id,
            organizationId,
            status: { notIn: ['HIRED', 'REJECTED', 'WITHDRAWN'] },
            hiredEmployeeId: null,
          },
          data: {
            status: 'HIRED',
            hiredAt: new Date(),
            hiredEmployeeId: employee.id,
            ...(hiredStageId && { currentStageId: hiredStageId }),
          },
        });
        if (appClaim.count === 0) {
          throw new BadRequestException(
            'Application was modified concurrently — hire aborted',
          );
        }

        // Atomic claim on candidate row
        const candClaim = await tx.candidate.updateMany({
          where: {
            id: candidate.id,
            organizationId,
            convertedEmployeeId: null,
          },
          data: { convertedEmployeeId: employee.id },
        });
        if (candClaim.count === 0) {
          throw new BadRequestException(
            'Candidate was modified concurrently — hire aborted',
          );
        }

        // Increment positionsFilled; close the requisition if quota met
        const updatedReq = await tx.jobRequisition.update({
          where: { id: requisition.id },
          data: { positionsFilled: { increment: 1 } },
        });
        if (updatedReq.positionsFilled >= updatedReq.numberOfOpenings) {
          await tx.jobRequisition.update({
            where: { id: requisition.id },
            data: { status: 'FILLED' },
          });
        }

        // Stage history (only if we have both a hiredStage and an actor)
        if (hiredStageId && actor) {
          await tx.applicationStageHistory.create({
            data: {
              applicationId: application.id,
              fromStageId: application.currentStageId,
              toStageId: hiredStageId,
              movedByEmployeeId: actor.id,
              notes: 'Hired via offer conversion',
            },
          });
        }

        return { employee, applicationId: application.id };
      });
    } catch (error) {
      // Translate unique-constraint violations into clean 400s
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Concurrent hire detected — this candidate or application is already linked to an employee',
        );
      }
      throw error;
    } finally {
      // Fire the event only on success — emit outside the transaction.
      // The try block returns before reaching here on success, so we use a
      // separate post-transaction emit at the call site below.
    }
  }

  /**
   * Helper that wraps `hire()` and emits the notification on success.
   * Controllers should call this method.
   */
  async hireAndNotify(
    userId: string,
    organizationId: string,
    offerId: string,
    dto: HireCandidateDto,
  ) {
    const result = await this.hire(userId, organizationId, offerId, dto);

    // Fire-and-forget onboarding start. A failure here must NOT roll back the
    // hire — the transaction is already committed. HR can manually start an
    // instance later via POST /onboarding-instances.
    try {
      await this.onboardingInstancesService.startForNewHire({
        organizationId,
        employeeId: result.employee.id,
        joiningDate: new Date(dto.joiningDate),
        createdByUserId: userId,
      });
    } catch (err) {
      this.logger.error(
        `Failed to start onboarding for new hire ${result.employee.id}`,
        err instanceof Error ? err.stack : String(err),
      );
    }

    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        application: {
          include: {
            candidate: { select: { firstName: true, lastName: true } },
            jobRequisition: { select: { title: true, hiringManagerId: true } },
          },
        },
      },
    });

    if (offer) {
      this.eventEmitter.emit(NotificationEvents.CANDIDATE_HIRED, {
        organizationId,
        actorUserId: userId,
        referenceId: result.employee.id,
        referenceType: 'Employee',
        recipientEmployeeIds: [offer.application.jobRequisition.hiringManagerId],
        variables: {
          candidateName: `${offer.application.candidate.firstName} ${offer.application.candidate.lastName}`,
          title: offer.application.jobRequisition.title,
          employeeCode: result.employee.employeeCode,
        },
      });
    }

    return result;
  }
}
