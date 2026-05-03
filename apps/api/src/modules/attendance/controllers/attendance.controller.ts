import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from '../services/attendance.service';
import { AttendanceReconciliationService } from '../services/attendance-reconciliation.service';
import { AttendancePoliciesService } from '../services/attendance-policies.service';
import { CheckInDto } from '../dto/check-in.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';
import { ClientIp } from '../../../common/decorators/client-ip.decorator';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly reconciliationService: AttendanceReconciliationService,
    private readonly policiesService: AttendancePoliciesService,
  ) {}

  // ─── Employee Self-Service ───────────────

  @Post('check-in')
  @RequirePermissions('attendance.checkin')
  @ApiOperation({ summary: 'Check in for the current day' })
  async checkIn(
    @CurrentUser() user: AuthenticatedUser,
    @ClientIp() ip: string,
    @Body() dto: CheckInDto,
  ) {
    return this.attendanceService.checkIn(
      user.userId,
      user.organizationId,
      ip,
      dto,
    );
  }

  @Post('check-out')
  @RequirePermissions('attendance.checkin')
  @ApiOperation({ summary: 'Check out for the current day' })
  async checkOut(
    @CurrentUser() user: AuthenticatedUser,
    @ClientIp() ip: string,
    @Body() dto: CheckInDto,
  ) {
    return this.attendanceService.checkOut(
      user.userId,
      user.organizationId,
      ip,
      dto,
    );
  }

  @Get('my/today')
  @RequirePermissions('attendance.read_own')
  @ApiOperation({ summary: 'Get my attendance summary and logs for today' })
  async getMyToday(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.getMyToday(user.userId, user.organizationId);
  }

  @Get('my-policy')
  @RequirePermissions('attendance.checkin')
  @ApiOperation({
    summary:
      "Get the attendance policy that applies to the current user today (used by UI to detect non-working days). Returns null if no assignment and no org default.",
  })
  async getMyPolicy(@CurrentUser() user: AuthenticatedUser) {
    return this.policiesService.getEffectivePolicyForUser(
      user.userId,
      user.organizationId,
    );
  }

  @Get('my/logs')
  @RequirePermissions('attendance.read_own')
  @ApiOperation({ summary: 'Get my attendance logs for a date range' })
  @ApiQuery({ name: 'from', required: true, example: '2025-06-01' })
  @ApiQuery({ name: 'to', required: true, example: '2025-06-30' })
  async getMyLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.attendanceService.getMyLogs(
      user.userId,
      user.organizationId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('my/summaries')
  @RequirePermissions('attendance.read_own')
  @ApiOperation({ summary: 'Get my daily summaries for a date range' })
  @ApiQuery({ name: 'from', required: true, example: '2025-06-01' })
  @ApiQuery({ name: 'to', required: true, example: '2025-06-30' })
  async getMySummaries(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.attendanceService.getMySummaries(
      user.userId,
      user.organizationId,
      new Date(from),
      new Date(to),
    );
  }

  // ─── Admin Queries ───────────────────────

  @Get('summaries')
  @RequirePermissions('attendance.read')
  @ApiOperation({ summary: 'List daily summaries for all employees (admin)' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getSummaries(
    @CurrentUser() user: AuthenticatedUser,
    @Query('employeeId') employeeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendanceService.getSummaries(user.organizationId, {
      employeeId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('logs')
  @RequirePermissions('attendance.read')
  @ApiOperation({ summary: 'List attendance logs for all employees (admin)' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('employeeId') employeeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendanceService.getLogs(user.organizationId, {
      employeeId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  // ─── Admin: Reconciliation Trigger ───────

  @Post('admin/reconcile')
  @RequirePermissions('attendance.manage')
  @ApiOperation({
    summary:
      'Manually run attendance reconciliation for a given civil day (defaults to yesterday in org tz). Backfills WEEKEND/HOLIDAY/ABSENT/ON_LEAVE rows for all active employees.',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    example: '2026-05-02',
    description: 'YYYY-MM-DD civil day. If omitted, reconciles yesterday.',
  })
  async triggerReconciliation(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date?: string,
  ) {
    let target: Date;
    if (date) {
      // Parse YYYY-MM-DD as a UTC-midnight Date so it lines up with @db.Date storage.
      const parts = date.split('-').map(Number);
      if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
        throw new BadRequestException(
          `Invalid date format: ${date} (expected YYYY-MM-DD)`,
        );
      }
      const [y, m, d] = parts;
      target = new Date(Date.UTC(y, m - 1, d));
    } else {
      // Yesterday in UTC (cron path computes per-org tz; here we pick UTC for simplicity)
      target = new Date();
      target.setUTCDate(target.getUTCDate() - 1);
      target.setUTCHours(0, 0, 0, 0);
    }

    const result = await this.reconciliationService.reconcileDay(
      user.organizationId,
      target,
    );

    return {
      organizationId: user.organizationId,
      date: target.toISOString().slice(0, 10),
      ...result,
    };
  }
}
