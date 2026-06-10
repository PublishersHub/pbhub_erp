import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { EmployeesService } from '../services/employees.service';
import { EmployeeIdCardService } from '../services/employee-id-card.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { UpdateSelfEmployeeDto } from '../dto/update-self-employee.dto';
import { CreateEmploymentDetailDto } from '../dto/create-employment-detail.dto';
import { UpdateEmploymentDetailDto } from '../dto/update-employment-detail.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly idCardService: EmployeeIdCardService,
  ) {}

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

  @Get('me')
  @RequirePermissions('employee.read_own')
  @ApiOperation({
    summary: "Get the calling user's own employee profile (or null if none)",
  })
  async findMe(@CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.findMe(user.organizationId, user.userId);
  }

  @Patch('me')
  @RequirePermissions('employee.read_own')
  @ApiOperation({
    summary: "Update fields of the calling user's own employee profile (currently profile photo only)",
  })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSelfEmployeeDto,
  ) {
    return this.employeesService.updateMe(user.organizationId, user.userId, dto);
  }

  @Get(':id')
  @RequirePermissions('employee.read')
  @ApiOperation({ summary: 'Get employee by ID with full details' })
  async findById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.employeesService.findById(user.organizationId, id);
  }

  // ─── ID Card PDF ────────────────────────────
  // Gated by `employee.read_own`; the service-level check below allows the
  // record's owner OR any caller with `employee.read` (admins/HR).
  @Get(':id/id-card.pdf')
  @RequirePermissions('employee.read_own')
  @ApiOperation({ summary: 'Download printable employee ID card PDF' })
  async downloadIdCard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const owner = await this.idCardService.findOwnership(user.organizationId, id);
    if (!owner) throw new NotFoundException('Employee not found');
    const isSelf = owner.userId === user.userId;
    if (!isSelf && !user.permissions.includes('employee.read')) {
      throw new ForbiddenException('You can only download your own ID card');
    }

    const buf = await this.idCardService.generateIdCardPdf(user.organizationId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="id-card-${owner.employeeCode}.pdf"`,
    );
    res.send(buf);
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

  @Patch(':id/reactivate')
  @RequirePermissions('employee.update')
  @ApiOperation({ summary: 'Reactivate a previously deactivated employee' })
  async reactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.employeesService.reactivate(user.organizationId, id);
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
