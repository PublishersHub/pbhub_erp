import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LeaveRequestsService } from '../services/leave-requests.service';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { ReviewLeaveRequestDto } from '../dto/review-leave-request.dto';
import { CancelLeaveRequestDto } from '../dto/cancel-leave-request.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Leave Requests')
@ApiBearerAuth()
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly requestsService: LeaveRequestsService) {}

  // ─── Employee self-service ────────────

  @Post()
  @RequirePermissions('leave.read_own')
  @ApiOperation({ summary: 'Submit a leave request' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    return this.requestsService.create(user.userId, user.organizationId, dto);
  }

  @Get('my')
  @RequirePermissions('leave.read_own')
  @ApiOperation({ summary: 'List my leave requests' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] })
  async findMyRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
  ) {
    return this.requestsService.findMyRequests(user.userId, user.organizationId, status);
  }

  @Patch(':id/cancel')
  @RequirePermissions('leave.read_own')
  @ApiOperation({ summary: 'Cancel my leave request' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelLeaveRequestDto,
  ) {
    return this.requestsService.cancel(user.userId, user.organizationId, id, dto);
  }

  // ─── Approver ─────────────────────────

  @Get('pending')
  @RequirePermissions('leave.approve')
  @ApiOperation({ summary: 'List pending requests for approver' })
  async findPendingForApprover(@CurrentUser() user: AuthenticatedUser) {
    return this.requestsService.findPendingForApprover(
      user.userId,
      user.organizationId,
      user.roles,
    );
  }

  @Patch(':id/review')
  @RequirePermissions('leave.approve')
  @ApiOperation({ summary: 'Approve or reject a leave request' })
  async review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewLeaveRequestDto,
  ) {
    return this.requestsService.review(
      user.userId,
      user.organizationId,
      id,
      dto,
      user.roles,
    );
  }

  // ─── Admin/HR ─────────────────────────

  @Get()
  @RequirePermissions('leave.read')
  @ApiOperation({ summary: 'List all leave requests (admin/HR)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
  ) {
    return this.requestsService.findAll(user.organizationId, status);
  }

  @Get(':id')
  @RequirePermissions('leave.read_own')
  @ApiOperation({ summary: 'Get leave request details (owner, approver, or HR)' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.requestsService.findById(
      user.organizationId,
      id,
      user.userId,
      user.permissions,
    );
  }
}
