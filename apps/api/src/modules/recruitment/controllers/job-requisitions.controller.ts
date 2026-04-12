import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JobRequisitionStatus } from '@prisma/client';
import { JobRequisitionsService } from '../services/job-requisitions.service';
import { CreateJobRequisitionDto } from '../dto/create-job-requisition.dto';
import { UpdateJobRequisitionDto } from '../dto/update-job-requisition.dto';
import { ReviewRequisitionDto } from '../dto/review-requisition.dto';
import { CloseRequisitionDto } from '../dto/close-requisition.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Job Requisitions')
@ApiBearerAuth()
@Controller('job-requisitions')
export class JobRequisitionsController {
  constructor(private readonly service: JobRequisitionsService) {}

  @Post()
  @RequirePermissions('recruitment.requisition.create')
  @ApiOperation({ summary: 'Create job requisition (DRAFT)' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateJobRequisitionDto,
  ) {
    return this.service.create(user.userId, user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('recruitment.read')
  @ApiOperation({ summary: 'List job requisitions' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'DRAFT',
      'PENDING_APPROVAL',
      'APPROVED',
      'REJECTED',
      'OPEN',
      'ON_HOLD',
      'FILLED',
      'CANCELLED',
      'CLOSED',
    ],
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: JobRequisitionStatus,
  ) {
    return this.service.findAll(user.organizationId, status);
  }

  @Get(':id')
  @RequirePermissions('recruitment.read')
  @ApiOperation({ summary: 'Get requisition detail' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.findById(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('recruitment.requisition.create')
  @ApiOperation({ summary: 'Update draft requisition' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateJobRequisitionDto,
  ) {
    return this.service.update(user.userId, user.organizationId, id, dto);
  }

  @Patch(':id/submit')
  @RequirePermissions('recruitment.requisition.create')
  @ApiOperation({ summary: 'Submit requisition for approval' })
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.submit(user.userId, user.organizationId, id);
  }

  @Patch(':id/review')
  @RequirePermissions('recruitment.requisition.approve')
  @ApiOperation({ summary: 'Approve or reject a requisition' })
  async review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewRequisitionDto,
  ) {
    return this.service.review(
      user.userId,
      user.organizationId,
      id,
      dto,
      user.roles,
    );
  }

  @Patch(':id/close')
  @RequirePermissions('recruitment.requisition.approve')
  @ApiOperation({ summary: 'Close a requisition' })
  async close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CloseRequisitionDto,
  ) {
    return this.service.close(user.userId, user.organizationId, id, dto);
  }
}
