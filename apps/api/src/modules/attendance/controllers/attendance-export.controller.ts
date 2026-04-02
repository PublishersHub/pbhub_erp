import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AttendanceExportService } from '../services/attendance-export.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Attendance Exports')
@ApiBearerAuth()
@Controller('attendance-exports')
export class AttendanceExportController {
  constructor(private readonly exportService: AttendanceExportService) {}

  @Get('month')
  @RequirePermissions('attendance.read')
  @ApiOperation({ summary: 'Download organization monthly attendance report as CSV' })
  @ApiQuery({ name: 'month', required: true, example: '2026-03' })
  async exportOrganizationMonthly(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.exportService.exportOrganizationMonthlyCsv(
      user.organizationId,
      month,
    );

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="attendance-${month}.csv"`,
    });

    return csv;
  }

  @Get('employee/:id/month')
  @RequirePermissions('attendance.read')
  @ApiOperation({ summary: 'Download employee monthly attendance report as CSV' })
  @ApiQuery({ name: 'month', required: true, example: '2026-03' })
  async exportEmployeeMonthly(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') employeeId: string,
    @Query('month') month: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.exportService.exportEmployeeMonthlyCsv(
      user.organizationId,
      employeeId,
      month,
    );

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="attendance-employee-${employeeId}-${month}.csv"`,
    });

    return csv;
  }
}
