import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from '../services/attendance.service';
import { CheckInDto } from '../dto/check-in.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';
import { ClientIp } from '../../../common/decorators/client-ip.decorator';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

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
}
