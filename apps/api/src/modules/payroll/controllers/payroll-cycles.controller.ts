import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PayrollCyclesService } from '../services/payroll-cycles.service';
import { PayrollGenerationService } from '../services/payroll-generation.service';
import { CreatePayrollCycleDto } from '../dto/create-payroll-cycle.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Payroll Cycles')
@ApiBearerAuth()
@Controller('payroll-cycles')
export class PayrollCyclesController {
  constructor(
    private readonly cyclesService: PayrollCyclesService,
    private readonly generationService: PayrollGenerationService,
  ) {}

  @Post()
  @RequirePermissions('payroll.run')
  @ApiOperation({ summary: 'Create a payroll cycle' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayrollCycleDto,
  ) {
    return this.cyclesService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('payroll.read')
  @ApiOperation({ summary: 'List payroll cycles' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('year') year?: string,
  ) {
    return this.cyclesService.findAll(
      user.organizationId,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get(':id')
  @RequirePermissions('payroll.read')
  @ApiOperation({ summary: 'Get payroll cycle detail' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.cyclesService.findById(user.organizationId, id);
  }

  @Post(':id/generate')
  @RequirePermissions('payroll.run')
  @ApiOperation({ summary: 'Generate payroll for a cycle' })
  async generate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.generationService.generatePayroll(user.organizationId, id);
  }

  @Post(':id/regenerate')
  @RequirePermissions('payroll.run')
  @ApiOperation({ summary: 'Re-generate payroll (PROCESSED only)' })
  async regenerate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.generationService.regeneratePayroll(user.organizationId, id);
  }

  @Patch(':id/finalize')
  @RequirePermissions('payroll.approve')
  @ApiOperation({ summary: 'Finalize (lock) a payroll cycle' })
  async finalize(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.cyclesService.finalize(user.organizationId, id, user.userId);
  }
}
