import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LeaveBalancesService } from '../services/leave-balances.service';
import { AdjustBalanceDto } from '../dto/adjust-balance.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Leave Balances')
@ApiBearerAuth()
@Controller('leave-balances')
export class LeaveBalancesController {
  constructor(private readonly balancesService: LeaveBalancesService) {}

  // ─── Employee self-service ────────────

  @Get('my')
  @RequirePermissions('leave.read_own')
  @ApiOperation({ summary: 'Get my leave balances' })
  @ApiQuery({ name: 'year', required: true, example: 2026 })
  async getMyBalances(
    @CurrentUser() user: AuthenticatedUser,
    @Query('year') year: string,
  ) {
    return this.balancesService.getMyBalances(
      user.userId,
      user.organizationId,
      this.parseYear(year),
    );
  }

  // ─── Admin/HR ─────────────────────────

  @Get('employee/:employeeId')
  @RequirePermissions('leave.manage')
  @ApiOperation({ summary: 'Get leave balances for an employee' })
  @ApiQuery({ name: 'year', required: true, example: 2026 })
  async getEmployeeBalances(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Query('year') year: string,
  ) {
    return this.balancesService.getEmployeeBalances(
      user.organizationId,
      employeeId,
      this.parseYear(year),
    );
  }

  @Post('initialize/:employeeId')
  @RequirePermissions('leave.manage')
  @ApiOperation({ summary: 'Initialize leave balances for an employee for a year' })
  @ApiQuery({ name: 'year', required: true, example: 2026 })
  async initializeBalances(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Query('year') year: string,
  ) {
    return this.balancesService.initializeBalances(
      user.organizationId,
      employeeId,
      this.parseYear(year),
    );
  }

  @Post('adjust')
  @RequirePermissions('leave.manage')
  @ApiOperation({ summary: 'Adjust leave balance for an employee' })
  async adjustBalance(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AdjustBalanceDto,
  ) {
    return this.balancesService.adjustBalance(user.organizationId, dto);
  }

  // ─── Helpers ──────────────────────────

  private parseYear(value: string): number {
    const year = parseInt(value, 10);
    if (isNaN(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('year must be a valid number between 2000 and 2100');
    }
    return year;
  }
}
