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
import { DepartmentsService } from '../services/departments.service';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @RequirePermissions('employee.create')
  @ApiOperation({ summary: 'Create a department' })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('employee.read')
  @ApiOperation({ summary: 'List all departments' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.departmentsService.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('employee.read')
  @ApiOperation({ summary: 'Get department by ID' })
  async findById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.departmentsService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('employee.update')
  @ApiOperation({ summary: 'Update a department' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('employee.delete')
  @ApiOperation({ summary: 'Deactivate a department (soft delete)' })
  async deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.departmentsService.deactivate(user.organizationId, id);
  }
}
