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
import { LeavePoliciesService } from '../services/leave-policies.service';
import { CreateLeavePolicyDto } from '../dto/create-leave-policy.dto';
import { UpdateLeavePolicyDto } from '../dto/update-leave-policy.dto';
import { AssignLeavePolicyDto } from '../dto/assign-leave-policy.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Leave Policies')
@ApiBearerAuth()
@Controller('leave-policies')
export class LeavePoliciesController {
  constructor(private readonly policiesService: LeavePoliciesService) {}

  @Post()
  @RequirePermissions('leave.manage')
  @ApiOperation({ summary: 'Create a leave policy' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLeavePolicyDto,
  ) {
    return this.policiesService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('leave.manage')
  @ApiOperation({ summary: 'List all leave policies' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.policiesService.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('leave.manage')
  @ApiOperation({ summary: 'Get leave policy by ID with assignments' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.policiesService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('leave.manage')
  @ApiOperation({ summary: 'Update a leave policy' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateLeavePolicyDto,
  ) {
    return this.policiesService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('leave.manage')
  @ApiOperation({ summary: 'Deactivate a leave policy (soft delete)' })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.policiesService.deactivate(user.organizationId, id);
  }

  // ─── Policy Assignments ───────────────

  @Post(':id/assignments')
  @RequirePermissions('leave.manage')
  @ApiOperation({ summary: 'Assign leave policy to an employee' })
  async assignPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') policyId: string,
    @Body() dto: AssignLeavePolicyDto,
  ) {
    return this.policiesService.assignPolicy(user.organizationId, policyId, dto);
  }

  @Delete(':id/assignments/:assignmentId')
  @RequirePermissions('leave.manage')
  @ApiOperation({ summary: 'Remove a leave policy assignment' })
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
