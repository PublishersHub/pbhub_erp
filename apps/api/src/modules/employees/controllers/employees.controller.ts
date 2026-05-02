import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EmployeesService } from '../services/employees.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { CreateEmploymentDetailDto } from '../dto/create-employment-detail.dto';
import { UpdateEmploymentDetailDto } from '../dto/update-employment-detail.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequirePermissions('employee.create')
  @ApiOperation({ summary: 'Create an employee' })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('employee.read')
  @ApiOperation({ summary: 'List employees with optional filters' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'designationId', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('departmentId') departmentId?: string,
    @Query('designationId') designationId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.employeesService.findAll(user.organizationId, {
      departmentId,
      designationId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
    });
  }

  @Get('my-team')
  @ApiOperation({
    summary: "Get the calling user's direct reports + themselves",
  })
  async findMyTeam(@CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.findMyTeam(user.organizationId, user.userId);
  }

  @Get(':id')
  @RequirePermissions('employee.read')
  @ApiOperation({ summary: 'Get employee by ID with full details' })
  async findById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.employeesService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('employee.update')
  @ApiOperation({ summary: 'Update employee details' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('employee.delete')
  @ApiOperation({ summary: 'Deactivate an employee (soft delete)' })
  async deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.employeesService.deactivate(user.organizationId, id);
  }

  // ─── Employment Detail ──────────────────────

  @Put(':id/employment-detail')
  @RequirePermissions('employee.update')
  @ApiOperation({ summary: 'Create or fully replace employment detail (all required fields)' })
  async createOrReplaceEmploymentDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateEmploymentDetailDto,
  ) {
    return this.employeesService.createOrReplaceEmploymentDetail(user.organizationId, id, dto);
  }

  @Patch(':id/employment-detail')
  @RequirePermissions('employee.update')
  @ApiOperation({ summary: 'Partially update existing employment detail (must exist)' })
  async updateEmploymentDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmploymentDetailDto,
  ) {
    return this.employeesService.updateEmploymentDetail(user.organizationId, id, dto);
  }
}
