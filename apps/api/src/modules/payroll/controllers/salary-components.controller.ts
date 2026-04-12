import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SalaryComponentsService } from '../services/salary-components.service';
import { CreateSalaryComponentDto } from '../dto/create-salary-component.dto';
import { UpdateSalaryComponentDto } from '../dto/update-salary-component.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Salary Components')
@ApiBearerAuth()
@Controller('salary-components')
export class SalaryComponentsController {
  constructor(private readonly service: SalaryComponentsService) {}

  @Post()
  @RequirePermissions('payroll.run')
  @ApiOperation({ summary: 'Create a salary component' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSalaryComponentDto,
  ) {
    return this.service.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('payroll.read')
  @ApiOperation({ summary: 'List all salary components' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('payroll.read')
  @ApiOperation({ summary: 'Get salary component by ID' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.findById(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('payroll.run')
  @ApiOperation({ summary: 'Update a salary component' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSalaryComponentDto,
  ) {
    return this.service.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('payroll.run')
  @ApiOperation({ summary: 'Deactivate a salary component (soft delete)' })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.deactivate(user.organizationId, id);
  }
}
