import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SalaryStructuresService } from '../services/salary-structures.service';
import { SetSalaryStructureDto } from '../dto/set-salary-structure.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Salary Structures')
@ApiBearerAuth()
@Controller('salary-structures')
export class SalaryStructuresController {
  constructor(private readonly service: SalaryStructuresService) {}

  @Post()
  @RequirePermissions('payroll.run')
  @ApiOperation({ summary: 'Set salary structure for an employee' })
  async setSalaryStructure(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetSalaryStructureDto,
  ) {
    return this.service.setSalaryStructure(user.organizationId, dto);
  }

  @Get('employee/:employeeId')
  @RequirePermissions('payroll.read')
  @ApiOperation({ summary: 'Get current salary structure for an employee' })
  async getEmployeeSalaryStructure(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
  ) {
    return this.service.getEmployeeSalaryStructure(user.organizationId, employeeId);
  }

  @Get('employee/:employeeId/history')
  @RequirePermissions('payroll.read')
  @ApiOperation({ summary: 'Get salary structure history for an employee' })
  async getSalaryHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
  ) {
    return this.service.getSalaryHistory(user.organizationId, employeeId);
  }
}
