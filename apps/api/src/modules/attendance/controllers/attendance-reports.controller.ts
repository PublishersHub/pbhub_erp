import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AttendanceReportsService } from '../services/attendance-reports.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Attendance Reports')
@ApiBearerAuth()
@Controller('attendance-reports')
export class AttendanceReportsController {
  constructor(private readonly reportsService: AttendanceReportsService) {}

  @Get('today')
  @RequirePermissions('attendance.read')
  @ApiOperation({ summary: 'Get organization attendance summary for today' })
  async getToday(@CurrentUser() user: AuthenticatedUser) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.reportsService.getOrganizationSummary(
      user.organizationId,
      today,
    );
  }

  @Get('employee/:id/month')
  @RequirePermissions('attendance.read')
  @ApiOperation({ summary: 'Get monthly attendance report for a specific employee' })
  @ApiQuery({ name: 'month', required: true, example: '2026-03' })
  async getEmployeeMonthly(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') employeeId: string,
    @Query('month') month: string,
  ) {
    return this.reportsService.getEmployeeMonthlyReport(
      user.organizationId,
      employeeId,
      month,
    );
  }

  @Get('month')
  @RequirePermissions('attendance.read')
  @ApiOperation({ summary: 'Get monthly attendance report for all employees' })
  @ApiQuery({ name: 'month', required: true, example: '2026-03' })
  async getOrganizationMonthly(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month: string,
  ) {
    return this.reportsService.getOrganizationMonthlyReport(
      user.organizationId,
      month,
    );
  }

  @Get('monthly-grid')
  @RequirePermissions('attendance.read')
  @ApiOperation({
    summary:
      'Excel-style monthly grid: employees x days with check-in/out and earned salary projection',
  })
  @ApiQuery({ name: 'month', required: true, example: '2026-03' })
  async getMonthlyGrid(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month: string,
  ) {
    return this.reportsService.getMonthlyGrid(user.organizationId, month);
  }
}
