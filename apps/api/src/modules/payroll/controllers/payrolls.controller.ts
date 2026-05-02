import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { PayrollsService } from '../services/payrolls.service';
import { PayslipPdfService } from '../services/payslip-pdf.service';
import { AddPayrollAdjustmentDto } from '../dto/add-payroll-adjustment.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Payrolls')
@ApiBearerAuth()
@Controller('payrolls')
export class PayrollsController {
  constructor(
    private readonly service: PayrollsService,
    private readonly payslipPdfService: PayslipPdfService,
  ) {}

  // ─── Employee self-service ──────────────

  @Get('my')
  @RequirePermissions('payroll.read_own')
  @ApiOperation({ summary: 'List my payslips' })
  async getMyPayslips(
    @CurrentUser() user: AuthenticatedUser,
    @Query('year') year?: string,
  ) {
    return this.service.getMyPayslips(
      user.userId,
      user.organizationId,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get('my/:cycleId')
  @RequirePermissions('payroll.read_own')
  @ApiOperation({ summary: 'Get my payslip for a specific cycle' })
  async getMyPayslip(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cycleId') cycleId: string,
  ) {
    return this.service.getMyPayslip(user.userId, user.organizationId, cycleId);
  }

  @Get(':id/pdf')
  @RequirePermissions('payroll.read_own')
  @ApiOperation({ summary: 'Download a payslip as PDF' })
  async downloadPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    // Permission gate: own payslip OR has payroll.read
    const payroll = await this.service.findOwnership(user.organizationId, id);
    if (!payroll) throw new NotFoundException('Payslip not found');
    const isOwn = payroll.employee.userId === user.userId;
    if (!isOwn && !user.permissions.includes('payroll.read')) {
      throw new ForbiddenException('You can only download your own payslip');
    }

    const buf = await this.payslipPdfService.generate(user.organizationId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="payslip-${payroll.payrollCycle.year}-${String(payroll.payrollCycle.month).padStart(2, '0')}.pdf"`,
    );
    res.send(buf);
  }

  // ─── Admin views ────────────────────────

  @Get('cycle/:cycleId')
  @RequirePermissions('payroll.read')
  @ApiOperation({ summary: 'List all payrolls for a cycle' })
  async listPayrolls(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cycleId') cycleId: string,
  ) {
    return this.service.listPayrolls(user.organizationId, cycleId);
  }

  @Get('employee/:employeeId/cycle/:cycleId')
  @RequirePermissions('payroll.read')
  @ApiOperation({ summary: 'Get employee payroll for a cycle' })
  async getEmployeePayroll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Param('cycleId') cycleId: string,
  ) {
    return this.service.getEmployeePayroll(
      user.organizationId,
      employeeId,
      cycleId,
    );
  }

  // ─── Adjustments ────────────────────────

  @Post(':payrollId/adjustments')
  @RequirePermissions('payroll.run')
  @ApiOperation({ summary: 'Add a payroll adjustment' })
  async addAdjustment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('payrollId') payrollId: string,
    @Body() dto: AddPayrollAdjustmentDto,
  ) {
    return this.service.addAdjustment(
      user.organizationId,
      payrollId,
      dto,
      user.userId,
    );
  }

  @Delete('adjustments/:adjustmentId')
  @RequirePermissions('payroll.run')
  @ApiOperation({ summary: 'Remove a payroll adjustment' })
  async removeAdjustment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('adjustmentId') adjustmentId: string,
  ) {
    return this.service.removeAdjustment(user.organizationId, adjustmentId);
  }
}
