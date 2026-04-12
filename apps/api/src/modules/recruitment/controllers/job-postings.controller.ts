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
import { JobPostingsService } from '../services/job-postings.service';
import { ApplicationStagesService } from '../services/application-stages.service';
import { CreateJobPostingDto } from '../dto/create-job-posting.dto';
import { UpdateJobPostingDto } from '../dto/update-job-posting.dto';
import { CreateApplicationStageDto } from '../dto/create-application-stage.dto';
import { UpdateApplicationStageDto } from '../dto/update-application-stage.dto';
import { ReorderStagesDto } from '../dto/reorder-stages.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Job Postings')
@ApiBearerAuth()
@Controller('job-postings')
export class JobPostingsController {
  constructor(
    private readonly postingsService: JobPostingsService,
    private readonly stagesService: ApplicationStagesService,
  ) {}

  @Post()
  @RequirePermissions('recruitment.posting.manage')
  @ApiOperation({ summary: 'Create job posting (DRAFT)' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateJobPostingDto,
  ) {
    return this.postingsService.create(user.userId, user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('recruitment.read')
  @ApiOperation({ summary: 'List job postings' })
  @ApiQuery({ name: 'requisitionId', required: false })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('requisitionId') requisitionId?: string,
  ) {
    return this.postingsService.findAll(user.organizationId, requisitionId);
  }

  @Get(':id')
  @RequirePermissions('recruitment.read')
  @ApiOperation({ summary: 'Get posting detail' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.postingsService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('recruitment.posting.manage')
  @ApiOperation({ summary: 'Update job posting' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateJobPostingDto,
  ) {
    return this.postingsService.update(user.organizationId, id, dto);
  }

  @Patch(':id/publish')
  @RequirePermissions('recruitment.posting.manage')
  @ApiOperation({ summary: 'Publish job posting' })
  async publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.postingsService.publish(user.userId, user.organizationId, id);
  }

  @Patch(':id/close')
  @RequirePermissions('recruitment.posting.manage')
  @ApiOperation({ summary: 'Close job posting' })
  async close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.postingsService.close(user.organizationId, id);
  }

  // ─── Stages (nested under posting) ────

  @Get(':id/stages')
  @RequirePermissions('recruitment.read')
  @ApiOperation({ summary: 'List stages for a posting' })
  async listStages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.stagesService.findByPosting(user.organizationId, id);
  }

  @Post(':id/stages')
  @RequirePermissions('recruitment.posting.manage')
  @ApiOperation({ summary: 'Add a custom stage to a posting' })
  async createStage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateApplicationStageDto,
  ) {
    return this.stagesService.create(user.organizationId, id, dto);
  }

  @Patch('stages/:stageId')
  @RequirePermissions('recruitment.posting.manage')
  @ApiOperation({ summary: 'Update a stage' })
  async updateStage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('stageId') stageId: string,
    @Body() dto: UpdateApplicationStageDto,
  ) {
    return this.stagesService.update(user.organizationId, stageId, dto);
  }

  @Post(':id/stages/reorder')
  @RequirePermissions('recruitment.posting.manage')
  @ApiOperation({ summary: 'Reorder stages for a posting' })
  async reorderStages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReorderStagesDto,
  ) {
    return this.stagesService.reorder(user.organizationId, id, dto);
  }
}
