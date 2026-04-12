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
import { JobApplicationsService } from '../services/job-applications.service';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { MoveStageDto } from '../dto/move-stage.dto';
import { RejectApplicationDto } from '../dto/reject-application.dto';
import { WithdrawApplicationDto } from '../dto/withdraw-application.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Job Applications')
@ApiBearerAuth()
@Controller('job-applications')
export class JobApplicationsController {
  constructor(private readonly service: JobApplicationsService) {}

  @Post()
  @RequirePermissions('recruitment.application.manage')
  @ApiOperation({ summary: 'Create a job application' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApplicationDto,
  ) {
    return this.service.create(user.userId, user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('recruitment.read')
  @ApiOperation({ summary: 'List applications' })
  @ApiQuery({ name: 'requisitionId', required: false })
  @ApiQuery({ name: 'postingId', required: false })
  @ApiQuery({ name: 'candidateId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('requisitionId') requisitionId?: string,
    @Query('postingId') postingId?: string,
    @Query('candidateId') candidateId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(user.organizationId, {
      requisitionId,
      postingId,
      candidateId,
      status,
    });
  }

  @Get(':id')
  @RequirePermissions('recruitment.read')
  @ApiOperation({ summary: 'Get application detail' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.findById(user.organizationId, id);
  }

  @Patch(':id/move-stage')
  @RequirePermissions('recruitment.application.manage')
  @ApiOperation({ summary: 'Move application to a new stage' })
  async moveStage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MoveStageDto,
  ) {
    return this.service.moveStage(user.userId, user.organizationId, id, dto);
  }

  @Patch(':id/reject')
  @RequirePermissions('recruitment.application.manage')
  @ApiOperation({ summary: 'Reject application' })
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectApplicationDto,
  ) {
    return this.service.reject(user.userId, user.organizationId, id, dto);
  }

  @Patch(':id/withdraw')
  @RequirePermissions('recruitment.application.manage')
  @ApiOperation({ summary: 'Withdraw application' })
  async withdraw(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: WithdrawApplicationDto,
  ) {
    return this.service.withdraw(user.userId, user.organizationId, id, dto);
  }
}
