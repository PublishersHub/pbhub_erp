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

    const tz = await this.getOrgTimezone(organizationId);
    const now = new Date();
    const civilDayStart = this.startOfCivilDay(now, tz);
    const civilDayEnd = this.endOfCivilDay(now, tz);

    // STRICT MODE: one CHECK_IN per civil day. Either:
    //   - User has an open shift from yesterday that hasn't been closed yet, or
    //   - User already has any CHECK_IN today (paired or open).
    // Cap upper bound at `now` so future-dated rows don't fool the check.
    const lookbackStart = new Date(civilDayStart.getTime() - 24 * 60 * 60 * 1000);
    const recentLogs = await this.prisma.attendanceLog.findMany({
      where: {
        employeeId: employee.id,
        organizationId,
        timestamp: { gte: lookbackStart, lte: now },
      },
      orderBy: { timestamp: 'asc' },
    });

    // 1. Open shift from any prior day still active?
    const lastBeforeToday = [...recentLogs]
      .filter((l) => l.timestamp.getTime() < civilDayStart.getTime())
      .pop();
    if (lastBeforeToday?.logType === 'CHECK_IN') {
      throw new BadRequestException(
        'Your previous shift is still open. Please check out first.',
      );
    }

    // 2. Already checked in today?
    const todayLogs = recentLogs.filter(
      (l) => l.timestamp.getTime() >= civilDayStart.getTime(),
    );
    if (todayLogs.some((l) => l.logType === 'CHECK_IN')) {
      const isComplete = todayLogs.some((l) => l.logType === 'CHECK_OUT');
      throw new BadRequestException(
        isComplete
          ? 'Day already complete. Contact HR if you need a correction.'
          : 'Already checked in today.',
      );
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
        userAgent: dto.userAgent,
        deviceType: dto.deviceType,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracyMeters: dto.accuracyMeters,
        locationLabel: dto.locationLabel,
      },
    });

    await this.recalculateAffectedDays(
      organizationId,
      employee.id,
      [now],
      tz,
      ipResult.allowed,
    );

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

    const tz = await this.getOrgTimezone(organizationId);
    const now = new Date();
    const civilDayStart = this.startOfCivilDay(now, tz);
    const civilDayEnd = this.endOfCivilDay(now, tz);

    // STRICT MODE: there must be exactly one open CHECK_IN to close out.
    // Look back 24h so cross-midnight shifts (e.g. CHECK_IN at 23:50 yesterday)
    // can be properly closed. Cap upper bound at `now` to ignore future-dated rows.
    const lookbackStart = new Date(civilDayStart.getTime() - 24 * 60 * 60 * 1000);
    const recentLogs = await this.prisma.attendanceLog.findMany({
      where: {
        employeeId: employee.id,
        organizationId,
        timestamp: { gte: lookbackStart, lte: now },
      },
      orderBy: { timestamp: 'asc' },
    });

    // STRICT MODE: refuse a second CHECK_OUT today (give the clearer message first).
    const todayLogs = recentLogs.filter(
      (l) => l.timestamp.getTime() >= civilDayStart.getTime(),
    );
    if (todayLogs.some((l) => l.logType === 'CHECK_OUT')) {
      throw new BadRequestException(
        'Day already complete. Contact HR if you need a correction.',
      );
    }

    const lastLog = recentLogs[recentLogs.length - 1];
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
        userAgent: dto.userAgent,
        deviceType: dto.deviceType,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracyMeters: dto.accuracyMeters,
        locationLabel: dto.locationLabel,
      },
    });

    // If the matching CHECK_IN is on the previous civil day, recompute both.
    const affected = [now];
    if (lastLog.timestamp.getTime() < civilDayStart.getTime()) {
      affected.push(lastLog.timestamp);
    }
    await this.recalculateAffectedDays(
      organizationId,
      employee.id,
      affected,
      tz,
      ipResult.allowed,
    );

    return log;
  }

  // ─── Employee Self-Service Queries ───────

  /**
   * Today's summary + logs for the authenticated user.
   * Uses civilDateAsUtcMidnight for the summary lookup so the @db.Date
   * column matches the row written by recalculateDailySummary.
   */
  async getMyToday(userId: string, organizationId: string) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);
    const tz = await this.getOrgTimezone(organizationId);
    const now = new Date();
    const dayStart = this.startOfCivilDay(now, tz);
    const dayEnd = this.endOfCivilDay(now, tz);
    const summaryDate = this.civilDateAsUtcMidnight(now, tz);

    const [summary, logs] = await Promise.all([
      this.prisma.attendanceDailySummary.findUnique({
        where: { employeeId_date: { employeeId: employee.id, date: summaryDate } },
      }),
      this.prisma.attendanceLog.findMany({
        where: {
          employeeId: employee.id,
          organizationId,
          timestamp: { gte: dayStart, lte: dayEnd },
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

  /**
   * Recalculate the daily summary for the civil day that `date` falls into,
   * in the org's timezone. Handles cross-midnight pairs by widening the log
   * fetch window and attributing minutes per-day.
   *
   * Backwards-compatible signature (used by attendance-corrections.service).
   */
  async recalculateDailySummary(
    organizationId: string,
    employeeId: string,
    date: Date,
    isIpCompliant?: boolean,
  ) {
    const tz = await this.getOrgTimezone(organizationId);
    await this.recalculateDailySummaryInTz(
      organizationId,
      employeeId,
      date,
      tz,
      isIpCompliant,
    );
  }

  private async recalculateAffectedDays(
    organizationId: string,
    employeeId: string,
    dates: Date[],
    tz: string,
    isIpCompliant?: boolean,
  ) {
    // Dedupe by civil-day key.
    const seen = new Set<string>();
    for (const d of dates) {
      const key = this.startOfCivilDay(d, tz).toISOString();
      if (seen.has(key)) continue;
      seen.add(key);
      await this.recalculateDailySummaryInTz(
        organizationId,
        employeeId,
        d,
        tz,
        isIpCompliant,
      );
    }
  }

  private async recalculateDailySummaryInTz(
    organizationId: string,
    employeeId: string,
    date: Date,
    tz: string,
    isIpCompliant?: boolean,
  ) {
    const dayStart = this.startOfCivilDay(date, tz);
    const dayEnd = this.endOfCivilDay(date, tz);

    // Widen the window 12h either side so we catch CHECK_INs from the previous
    // civil day (which may pair with a CHECK_OUT today) and CHECK_OUTs on the
    // next civil day (paired with one of today's CHECK_INs).
    const fetchStart = new Date(dayStart.getTime() - 12 * 60 * 60 * 1000);
    const fetchEnd = new Date(dayEnd.getTime() + 12 * 60 * 60 * 1000);

    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        employeeId,
        organizationId,
        timestamp: { gte: fetchStart, lte: fetchEnd },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Pair CHECK_INs with their next CHECK_OUT chronologically, ignoring day
    // boundaries. An unmatched trailing CHECK_IN means "still working" — its
    // minutes are NOT counted in the persisted summary (in-progress state).
    type Pair = { checkIn: Date; checkOut: Date };
    const pairs: Pair[] = [];
    let openCheckIn: Date | null = null;
    for (const log of logs) {
      if (log.logType === 'CHECK_IN') {
        // If a previous CHECK_IN is still open (no CHECK_OUT between), the new
        // CHECK_IN supersedes it (data anomaly — drop the old open one).
        openCheckIn = log.timestamp;
      } else if (log.logType === 'CHECK_OUT' && openCheckIn) {
        pairs.push({ checkIn: openCheckIn, checkOut: log.timestamp });
        openCheckIn = null;
      }
      // CHECK_OUT without an open CHECK_IN is ignored (data anomaly).
    }

    // For the target civil day, sum minutes attributed to it from each pair,
    // and track first-attributed-checkIn / last-attributed-checkOut.
    const dayStartMs = dayStart.getTime();
    const dayEndMs = dayEnd.getTime();
    let totalWorkedMinutes = 0;
    let firstCheckIn: Date | null = null;
    let lastCheckOut: Date | null = null;

    for (const pair of pairs) {
      const inMs = pair.checkIn.getTime();
      const outMs = pair.checkOut.getTime();
      // Overlap of [inMs, outMs] with this civil day's [dayStartMs, dayEndMs].
      const overlapStart = Math.max(inMs, dayStartMs);
      // dayEnd is 23:59:59.999 — treat it as inclusive for the segment end.
      const overlapEnd = Math.min(outMs, dayEndMs + 1);
      if (overlapEnd <= overlapStart) continue;

      const minutes = Math.round((overlapEnd - overlapStart) / 60000);
      totalWorkedMinutes += minutes;

      // firstCheckIn for this civil day = earliest pair-start that contributes.
      // For a pair that starts before midnight, clamp to dayStart.
      const attributedIn = new Date(overlapStart);
      if (!firstCheckIn || attributedIn.getTime() < firstCheckIn.getTime()) {
        firstCheckIn = attributedIn;
      }

      // lastCheckOut for this civil day = latest pair-end attributed.
      // For a pair that ends after midnight, clamp to dayEnd.
      const attributedOut = new Date(Math.min(outMs, dayEndMs));
      if (!lastCheckOut || attributedOut.getTime() > lastCheckOut.getTime()) {
        lastCheckOut = attributedOut;
      }
    }

    // If nothing in the window touched this civil day, only persist if a
    // summary already exists (so we can still update isIpCompliant). Otherwise
    // no-op — same behavior as before.
    const dayHadAnyLog = logs.some(
      (l) =>
        l.timestamp.getTime() >= dayStartMs && l.timestamp.getTime() <= dayEndMs,
    );
    if (totalWorkedMinutes === 0 && !dayHadAnyLog) {
      return;
    }

    // Get active policy assignment for this employee on this date.
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
        const checkInMin = this.civilMinutesOfDay(firstCheckIn, tz);
        const graceStart = policyStartMin + policy.graceMinutesLate;

        if (checkInMin > graceStart) {
          lateMinutes = checkInMin - policyStartMin;
          status = AttendanceStatus.LATE;
        }

        if (lastCheckOut) {
          const policyEndMin = this.parseTimeToMinutes(policy.endTime);
          const checkOutMin = this.civilMinutesOfDay(lastCheckOut, tz);
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

    // The Postgres @db.Date column wants a UTC-midnight Date so it truncates
    // to the right civil day. dayStart is the UTC instant for civil 00:00 in
    // the org tz, which for tz east of UTC sits on the previous UTC date.
    const summaryDate = this.civilDateAsUtcMidnight(dayStart, tz);

    // Preserve IP non-compliance: once false for the day, stays false.
    const existingSummary = await this.prisma.attendanceDailySummary.findUnique({
      where: { employeeId_date: { employeeId, date: summaryDate } },
    });
    const finalIpCompliant = existingSummary?.isIpCompliant === false
      ? false
      : (isIpCompliant ?? null);

    // ─── Day-type post-processing ────────────
    // If the civil day is NOT in the employee's policy.workingDays AND we have
    // worked minutes (someone logged time on a weekend), set status to WEEKEND
    // and reclassify the worked minutes as overtime — preserving the actual
    // hours but flagging the day type. The nightly reconciliation cron handles
    // HOLIDAY/ON_LEAVE overrides and creates ABSENT rows for employees with
    // no logs at all (we early-return above when nothing touched the day).
    {
      const workingDays = assignment?.attendancePolicy?.workingDays ?? [
        1, 2, 3, 4, 5,
      ];
      const civilParts = this.civilParts(dayStart, tz);
      const civilDow = new Date(
        Date.UTC(civilParts.y, civilParts.m - 1, civilParts.day),
      ).getUTCDay();
      if (!workingDays.includes(civilDow) && totalWorkedMinutes > 0) {
        status = AttendanceStatus.WEEKEND;
        overtimeMinutes = totalWorkedMinutes;
      }
    }

    await this.prisma.attendanceDailySummary.upsert({
      where: { employeeId_date: { employeeId, date: summaryDate } },
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
        date: summaryDate,
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

  private async getOrgTimezone(organizationId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { timezone: true },
    });
    return org?.timezone || 'UTC';
  }

  /**
   * Returns the UTC `Date` corresponding to 00:00:00.000 of the civil day
   * (in `tz`) that `d` falls into.
   *
   * Uses Intl.DateTimeFormat to extract the civil Y-M-D in `tz`, then computes
   * the tz's UTC offset for that wall-clock midnight (DST-correct via probing).
   */
  private startOfCivilDay(d: Date, tz: string): Date {
    const { y, m, day } = this.civilParts(d, tz);
    return this.zonedWallClockToUtc(y, m, day, 0, 0, 0, 0, tz);
  }

  /**
   * Returns the UTC `Date` corresponding to 23:59:59.999 of the civil day.
   */
  private endOfCivilDay(d: Date, tz: string): Date {
    const { y, m, day } = this.civilParts(d, tz);
    return this.zonedWallClockToUtc(y, m, day, 23, 59, 59, 999, tz);
  }

  /**
   * Returns the civil date as a UTC-midnight Date so Postgres @db.Date
   * truncates it to the right day. `startOfCivilDay()` returns a UTC instant
   * that for tz east of UTC (e.g. Karachi) lies on the *previous* UTC date,
   * which causes the daily summary's date to be off by one for tz != UTC.
   */
  private civilDateAsUtcMidnight(d: Date, tz: string): Date {
    const { y, m, day } = this.civilParts(d, tz);
    return new Date(Date.UTC(y, m - 1, day));
  }

  /** Civil minutes-of-day (0..1439) of `d` interpreted in `tz`. */
  private civilMinutesOfDay(d: Date, tz: string): number {
    const { hour, minute } = this.civilParts(d, tz);
    return hour * 60 + minute;
  }

  /** Extract civil Y/M/D/H/M/S of `d` in `tz` via Intl. */
  private civilParts(d: Date, tz: string) {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
    let hour = parseInt(get('hour'), 10);
    // Intl with hour12:false sometimes returns "24" for midnight in some envs.
    if (hour === 24) hour = 0;
    return {
      y: parseInt(get('year'), 10),
      m: parseInt(get('month'), 10),
      day: parseInt(get('day'), 10),
      hour,
      minute: parseInt(get('minute'), 10),
      second: parseInt(get('second'), 10),
    };
  }

  /**
   * Convert a wall-clock time in `tz` to the corresponding UTC Date.
   *
   * Approach: compute a candidate UTC by treating the wall-clock as if it were
   * UTC, then measure the tz's offset at that candidate via Intl and adjust.
   * Iterate once more to handle DST jumps near the boundary.
   */
  private zonedWallClockToUtc(
    y: number,
    m: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    ms: number,
    tz: string,
  ): Date {
    const targetUtcMs = Date.UTC(y, m - 1, day, hour, minute, second, ms);
    let candidate = new Date(targetUtcMs);
    for (let i = 0; i < 2; i++) {
      const offsetMs = this.getTzOffsetMs(candidate, tz);
      const corrected = new Date(targetUtcMs - offsetMs);
      if (corrected.getTime() === candidate.getTime()) {
        return corrected;
      }
      candidate = corrected;
    }
    return candidate;
  }

  /**
   * Returns the offset of `tz` at instant `d` in milliseconds, where
   * `localWallClock = utc + offset`. e.g. for Asia/Karachi the offset is
   * +5h, returned as +18000000.
   */
  private getTzOffsetMs(d: Date, tz: string): number {
    const parts = this.civilParts(d, tz);
    const asUtc = Date.UTC(
      parts.y,
      parts.m - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      0,
    );
    // Drop sub-second precision from `d` for a clean diff.
    const dMs = Math.floor(d.getTime() / 1000) * 1000;
    return asUtc - dMs;
  }

  private parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
