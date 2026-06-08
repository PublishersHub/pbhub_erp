import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IpRestrictionService } from './ip-restriction.service';
import { CheckInDto } from '../dto/check-in.dto';
import { AttendanceStatus } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ipRestrictionService: IpRestrictionService,
  ) {}

  // ─── Check-in / Check-out ────────────────

  async checkIn(
    userId: string,
    organizationId: string,
    ipAddress: string,
    dto: CheckInDto,
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const ipResult = await this.ipRestrictionService.validateIp(
      organizationId,
      employee.id,
      ipAddress,
    );
    if (!ipResult.allowed) {
      throw new BadRequestException(ipResult.reason);
    }

    const now = new Date();
    const todayStart = this.startOfDay(now);
    const todayEnd = this.endOfDay(now);

    // Prevent duplicate check-in (must check out before checking in again)
    const lastLog = await this.prisma.attendanceLog.findFirst({
      where: {
        employeeId: employee.id,
        organizationId,
        timestamp: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { timestamp: 'desc' },
    });
    if (lastLog?.logType === 'CHECK_IN') {
      throw new BadRequestException('Already checked in. Please check out first.');
    }

    const log = await this.prisma.attendanceLog.create({
      data: {
        organizationId,
        employeeId: employee.id,
        logType: 'CHECK_IN',
        timestamp: now,
        ipAddress,
        source: dto.source ?? 'WEB',
        notes: dto.notes,
      },
    });

    await this.recalculateDailySummary(organizationId, employee.id, now, ipResult.allowed);

    return log;
  }

  async checkOut(
    userId: string,
    organizationId: string,
    ipAddress: string,
    dto: CheckInDto,
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const ipResult = await this.ipRestrictionService.validateIp(
      organizationId,
      employee.id,
      ipAddress,
    );
    if (!ipResult.allowed) {
      throw new BadRequestException(ipResult.reason);
    }

    const now = new Date();
    const todayStart = this.startOfDay(now);
    const todayEnd = this.endOfDay(now);

    // Enforce proper sequence: last log today must be CHECK_IN
    const lastLog = await this.prisma.attendanceLog.findFirst({
      where: {
        employeeId: employee.id,
        organizationId,
        timestamp: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!lastLog || lastLog.logType !== 'CHECK_IN') {
      throw new BadRequestException('Cannot check out without checking in first');
    }

    const log = await this.prisma.attendanceLog.create({
      data: {
        organizationId,
        employeeId: employee.id,
        logType: 'CHECK_OUT',
        timestamp: now,
        ipAddress,
        source: dto.source ?? 'WEB',
        notes: dto.notes,
      },
    });

    await this.recalculateDailySummary(organizationId, employee.id, now, ipResult.allowed);

    return log;
  }

  // ─── Employee Self-Service Queries ───────

  async getMyToday(userId: string, organizationId: string) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);
    const today = this.startOfDay(new Date());

    const [summary, logs] = await Promise.all([
      this.prisma.attendanceDailySummary.findUnique({
        where: { employeeId_date: { employeeId: employee.id, date: today } },
      }),
      this.prisma.attendanceLog.findMany({
        where: {
          employeeId: employee.id,
          organizationId,
          timestamp: { gte: today, lt: this.endOfDay(new Date()) },
        },
        orderBy: { timestamp: 'asc' },
      }),
    ]);

    return { summary, logs };
  }

  async getMyLogs(userId: string, organizationId: string, from: Date, to: Date) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);
    return this.prisma.attendanceLog.findMany({
      where: {
        employeeId: employee.id,
        organizationId,
        timestamp: { gte: from, lte: to },
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  async getMySummaries(userId: string, organizationId: string, from: Date, to: Date) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);
    return this.prisma.attendanceDailySummary.findMany({
      where: {
        employeeId: employee.id,
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'asc' },
    });
  }

  // ─── Admin Queries ───────────────────────

  async getSummaries(
    organizationId: string,
    filters: { employeeId?: string; from?: Date; to?: Date },
  ) {
    return this.prisma.attendanceDailySummary.findMany({
      where: {
        organizationId,
        ...(filters.employeeId && { employeeId: filters.employeeId }),
        ...(filters.from &&
          filters.to && {
            date: { gte: filters.from, lte: filters.to },
          }),
      },
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ date: 'desc' }, { employeeId: 'asc' }],
    });
  }

  async getLogs(
    organizationId: string,
    filters: { employeeId?: string; from?: Date; to?: Date },
  ) {
    return this.prisma.attendanceLog.findMany({
      where: {
        organizationId,
        ...(filters.employeeId && { employeeId: filters.employeeId }),
        ...(filters.from &&
          filters.to && {
            timestamp: { gte: filters.from, lte: filters.to },
          }),
      },
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  // ─── Summary Recalculation ───────────────

  async recalculateDailySummary(
    organizationId: string,
    employeeId: string,
    date: Date,
    isIpCompliant?: boolean,
  ) {
    const dayStart = this.startOfDay(date);
    const dayEnd = this.endOfDay(date);

    // Get all logs for the day, ordered by time
    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        employeeId,
        organizationId,
        timestamp: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { timestamp: 'asc' },
    });

    if (logs.length === 0) return;

    // Pair check-ins with check-outs to compute worked minutes
    let totalWorkedMinutes = 0;
    let currentCheckIn: Date | null = null;
    let firstCheckIn: Date | null = null;
    let lastCheckOut: Date | null = null;

    for (const log of logs) {
      if (log.logType === 'CHECK_IN') {
        if (!firstCheckIn) firstCheckIn = log.timestamp;
        currentCheckIn = log.timestamp;
      } else if (log.logType === 'CHECK_OUT' && currentCheckIn) {
        const diff = (log.timestamp.getTime() - currentCheckIn.getTime()) / 60000;
        totalWorkedMinutes += Math.round(diff);
        lastCheckOut = log.timestamp;
        currentCheckIn = null;
      }
    }

    // Get active policy assignment for this employee on this date
    const assignment = await this.prisma.employeeAttendancePolicyAssignment.findFirst({
      where: {
        employeeId,
        effectiveFrom: { lte: dayStart },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: dayStart } }],
        attendancePolicy: { organizationId },
      },
      include: { attendancePolicy: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    let status: AttendanceStatus = AttendanceStatus.PRESENT;
    let lateMinutes = 0;
    let earlyDepartureMinutes = 0;
    let overtimeMinutes = 0;

    if (assignment?.attendancePolicy) {
      const policy = assignment.attendancePolicy;

      if (
        policy.policyType === 'FIXED' &&
        firstCheckIn &&
        policy.startTime &&
        policy.endTime
      ) {
        const policyStartMin = this.parseTimeToMinutes(policy.startTime);
        const checkInMin = firstCheckIn.getHours() * 60 + firstCheckIn.getMinutes();
        const graceStart = policyStartMin + policy.graceMinutesLate;

        if (checkInMin > graceStart) {
          lateMinutes = checkInMin - policyStartMin;
          status = AttendanceStatus.LATE;
        }

        if (lastCheckOut) {
          const policyEndMin = this.parseTimeToMinutes(policy.endTime);
          const checkOutMin = lastCheckOut.getHours() * 60 + lastCheckOut.getMinutes();
          const graceEnd = policyEndMin - policy.graceMinutesEarly;

          if (checkOutMin < graceEnd) {
            earlyDepartureMinutes = policyEndMin - checkOutMin;
          }

          const expectedMinutes = policyEndMin - policyStartMin;
          if (totalWorkedMinutes > expectedMinutes) {
            overtimeMinutes = totalWorkedMinutes - expectedMinutes;
          }

          if (
            policy.halfDayThresholdMinutes &&
            totalWorkedMinutes < policy.halfDayThresholdMinutes
          ) {
            status = AttendanceStatus.HALF_DAY;
          }
        }
      } else if (policy.policyType === 'FLEXIBLE' && policy.minHoursPerDay) {
        const minMinutes = Number(policy.minHoursPerDay) * 60;

        if (totalWorkedMinutes >= minMinutes) {
          status = AttendanceStatus.PRESENT;
          overtimeMinutes = Math.round(totalWorkedMinutes - minMinutes);
        } else if (
          policy.halfDayThresholdMinutes &&
          totalWorkedMinutes >= policy.halfDayThresholdMinutes
        ) {
          status = AttendanceStatus.HALF_DAY;
        } else if (totalWorkedMinutes >= minMinutes / 2) {
          status = AttendanceStatus.HALF_DAY;
        }
      }
    }

    // Preserve IP non-compliance: once false for the day, stays false
    const existingSummary = await this.prisma.attendanceDailySummary.findUnique({
      where: { employeeId_date: { employeeId, date: dayStart } },
    });
    const finalIpCompliant = existingSummary?.isIpCompliant === false
      ? false
      : (isIpCompliant ?? null);

    await this.prisma.attendanceDailySummary.upsert({
      where: { employeeId_date: { employeeId, date: dayStart } },
      update: {
        status,
        firstCheckIn,
        lastCheckOut,
        totalWorkedMinutes,
        overtimeMinutes,
        lateMinutes,
        earlyDepartureMinutes,
        isIpCompliant: finalIpCompliant,
      },
      create: {
        organizationId,
        employeeId,
        date: dayStart,
        status,
        firstCheckIn,
        lastCheckOut,
        totalWorkedMinutes,
        overtimeMinutes,
        lateMinutes,
        earlyDepartureMinutes,
        isIpCompliant: finalIpCompliant,
      },
    });
  }

  // ─── Admin: set check-in/out for a specific day ──
  //
  // Replaces existing CHECK_IN / CHECK_OUT logs for the day with the new
  // pair and re-derives the daily summary. Used by the editable monthly
  // grid for HR / Super Admin overrides.

  async setDayAttendance(
    organizationId: string,
    employeeId: string,
    date: string,
    checkInTime: string | null,
    checkOutTime: string | null,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId, isActive: true },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }

    const buildAt = (timeStr: string): Date => {
      if (!/^\d{2}:\d{2}$/.test(timeStr)) {
        throw new BadRequestException(`Invalid time "${timeStr}", expected HH:MM`);
      }
      const [y, m, d] = date.split('-').map(Number);
      const [hh, mm] = timeStr.split(':').map(Number);
      return new Date(y, m - 1, d, hh, mm, 0, 0);
    };

    const checkInAt = checkInTime ? buildAt(checkInTime) : null;
    const checkOutAt = checkOutTime ? buildAt(checkOutTime) : null;

    if (checkInAt && checkOutAt && checkOutAt <= checkInAt) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    const [y, m, d] = date.split('-').map(Number);
    const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);

    await this.prisma.$transaction(async (tx) => {
      // Wipe existing logs for the day
      await tx.attendanceLog.deleteMany({
        where: {
          employeeId,
          organizationId,
          timestamp: { gte: dayStart, lte: dayEnd },
        },
      });

      // Insert new logs
      if (checkInAt) {
        await tx.attendanceLog.create({
          data: {
            organizationId,
            employeeId,
            logType: 'CHECK_IN',
            timestamp: checkInAt,
            source: 'MANUAL',
            ipAddress: null,
            notes: 'Set by admin via grid',
          },
        });
      }
      if (checkOutAt) {
        await tx.attendanceLog.create({
          data: {
            organizationId,
            employeeId,
            logType: 'CHECK_OUT',
            timestamp: checkOutAt,
            source: 'MANUAL',
            ipAddress: null,
            notes: 'Set by admin via grid',
          },
        });
      }

      // If both removed, also clear the summary so it re-derives as absent
      if (!checkInAt && !checkOutAt) {
        await tx.attendanceDailySummary.deleteMany({
          where: { employeeId, date: this.startOfDayUtcFromCivil(date) },
        });
      }
    });

    // Re-derive the daily summary outside the transaction so it picks up the new logs
    if (checkInAt || checkOutAt) {
      await this.recalculateDailySummary(organizationId, employeeId, dayStart);
    }

    return { ok: true };
  }

  private startOfDayUtcFromCivil(date: string): Date {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  // ─── Helpers ─────────────────────────────

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

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
