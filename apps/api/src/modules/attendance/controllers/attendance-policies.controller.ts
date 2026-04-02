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
import { AttendancePoliciesService } from '../services/attendance-policies.service';
import { CreateAttendancePolicyDto } from '../dto/create-attendance-policy.dto';
import { UpdateAttendancePolicyDto } from '../dto/update-attendance-policy.dto';
import { AssignPolicyDto } from '../dto/assign-policy.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Attendance Policies')
@ApiBearerAuth()
@Controller('attendance-policies')
export class AttendancePoliciesController {
  constructor(private readonly policiesService: AttendancePoliciesService) {}

  @Post()
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Create an attendance policy' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAttendancePolicyDto,
  ) {
    return this.policiesService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'List attendance policies' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.policiesService.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Get attendance policy by ID with assignments' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.policiesService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Update an attendance policy' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAttendancePolicyDto,
  ) {
    return this.policiesService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Deactivate an attendance policy (soft delete)' })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.policiesService.deactivate(user.organizationId, id);
  }

  // ─── Policy Assignments ──────────────────

  @Post(':id/assignments')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Assign policy to an employee' })
  async assignPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') policyId: string,
    @Body() dto: AssignPolicyDto,
  ) {
    return this.policiesService.assignPolicy(user.organizationId, policyId, dto);
  }

  @Delete(':id/assignments/:assignmentId')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Remove a policy assignment' })
  async removeAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') policyId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.policiesService.removeAssignment(
      user.organizationId,
      policyId,
      assignmentId,
    );
  }
}
