import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { AttendanceService } from './attendance.service';
import { CreateCorrectionRequestDto } from '../dto/create-correction-request.dto';
import { ReviewCorrectionRequestDto } from '../dto/review-correction-request.dto';
import { NotificationEvents } from '../../notification/events/event-types';

@Injectable()
export class AttendanceCorrectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Employee submits a correction ──────

  async create(
    userId: string,
    organizationId: string,
    dto: CreateCorrectionRequestDto,
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);
    const date = new Date(dto.date);

    // Snapshot current summary as original data
    const summary = await this.prisma.attendanceDailySummary.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date } },
    });

    const created = await this.prisma.attendanceCorrectionRequest.create({
      data: {
        organizationId,
        employeeId: employee.id,
        date,
        originalCheckIn: summary?.firstCheckIn ?? null,
        originalCheckOut: summary?.lastCheckOut ?? null,
        requestedCheckIn: dto.requestedCheckIn ? new Date(dto.requestedCheckIn) : null,
        requestedCheckOut: dto.requestedCheckOut
          ? new Date(dto.requestedCheckOut)
          : null,
        reason: dto.reason,
      },
    });

    // Notify: manager (if any)
    const recipientEmployeeIds: string[] = [];
    if (employee.reportingManagerId) {
      recipientEmployeeIds.push(employee.reportingManagerId);
    }

    this.eventEmitter.emit(NotificationEvents.ATTENDANCE_CORRECTION_SUBMITTED, {
      organizationId,
      actorUserId: userId,
      referenceId: created.id,
      referenceType: 'AttendanceCorrectionRequest',
      recipientEmployeeIds,
      variables: {
        employeeName: `${employee.firstName} ${employee.lastName}`,
        date: date.toISOString().slice(0, 10),
      },
    });

    return created;
  }

  // ─── Employee views own requests ────────

  async findMyRequests(userId: string, organizationId: string) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    return this.prisma.attendanceCorrectionRequest.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Admin lists all requests ───────────

  async findAll(organizationId: string, status?: string) {
    return this.prisma.attendanceCorrectionRequest.findMany({
      where: {
        organizationId,
        ...(status && { status: status as any }),
      },
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        reviewedBy: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Admin reviews (approve/reject) ─────

  async review(
    reviewerUserId: string,
    organizationId: string,
    requestId: string,
    dto: ReviewCorrectionRequestDto,
  ) {
    // Find reviewer's employee record
    const reviewer = await this.findEmployeeByUserId(reviewerUserId, organizationId);

    const request = await this.prisma.attendanceCorrectionRequest.findFirst({
      where: { id: requestId, organizationId },
    });
    if (!request) throw new NotFoundException('Correction request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('This request has already been reviewed');
    }

    const updated = await this.prisma.attendanceCorrectionRequest.update({
      where: { id: requestId },
      data: {
        status: dto.status,
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
        reviewerRemarks: dto.remarks ?? null,
      },
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
      },
    });

    // If approved, apply corrected times to the daily summary
    if (dto.status === 'APPROVED') {
      await this.applyCorrection(request);
    }

    // Notify the requesting employee of the decision
    this.eventEmitter.emit(NotificationEvents.ATTENDANCE_CORRECTION_DECIDED, {
      organizationId,
      actorUserId: reviewerUserId,
      referenceId: requestId,
      referenceType: 'AttendanceCorrectionRequest',
      recipientEmployeeIds: [request.employeeId],
      variables: {
        date: request.date.toISOString().slice(0, 10),
        decision: dto.status,
        remarks: dto.remarks ?? '',
      },
    });

    return updated;
  }

  // ─── Helpers ─────────────────────────────

  /**
   * When a correction is approved, insert MANUAL attendance logs for the
   * corrected times, then recalculate the daily summary so that status
   * and minutes are derived from policy rules (not hardcoded).
   *
   * Original attendance logs remain immutable. MANUAL-source logs are
   * the audit trail alongside the correction request itself.
   */
  private async applyCorrection(request: {
    employeeId: string;
    date: Date;
    requestedCheckIn: Date | null;
    requestedCheckOut: Date | null;
    organizationId: string;
  }) {
    // Build MANUAL logs sorted by timestamp to preserve check-in/check-out pairing
    const logsToInsert: {
      logType: 'CHECK_IN' | 'CHECK_OUT';
      timestamp: Date;
    }[] = [];

    if (request.requestedCheckIn) {
      logsToInsert.push({ logType: 'CHECK_IN', timestamp: request.requestedCheckIn });
    }
    if (request.requestedCheckOut) {
      logsToInsert.push({ logType: 'CHECK_OUT', timestamp: request.requestedCheckOut });
    }

    // Sort by timestamp so CHECK_IN always precedes CHECK_OUT chronologically
    logsToInsert.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (const entry of logsToInsert) {
      await this.prisma.attendanceLog.create({
        data: {
          organizationId: request.organizationId,
          employeeId: request.employeeId,
          logType: entry.logType,
          timestamp: entry.timestamp,
          source: 'MANUAL',
          notes: 'Correction approved',
        },
      });
    }

    // Recalculate summary from all logs — status determined by policy rules
    await this.attendanceService.recalculateDailySummary(
      request.organizationId,
      request.employeeId,
      request.date,
    );
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
