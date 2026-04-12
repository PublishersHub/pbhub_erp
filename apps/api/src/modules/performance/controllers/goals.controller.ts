import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { GoalsService } from '../services/goals.service';
import { CreateGoalDto } from '../dto/create-goal.dto';
import { UpdateGoalDto } from '../dto/update-goal.dto';
import { ApproveGoalDto } from '../dto/approve-goal.dto';
import { UpdateGoalProgressDto } from '../dto/update-goal-progress.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Goals')
@ApiBearerAuth()
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  // ─── Create ────────────────────────────

  @Post()
  @RequirePermissions('performance.create_goals')
  @ApiOperation({ summary: 'Create a goal' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGoalDto,
  ) {
    return this.goalsService.create(user.userId, user.organizationId, dto);
  }

  // ─── List endpoints (before :id) ──────

  @Get('my')
  @RequirePermissions('performance.read_own')
  @ApiOperation({ summary: 'List my goals' })
  @ApiQuery({ name: 'cycleId', required: false })
  async findMyGoals(
    @CurrentUser() user: AuthenticatedUser,
    @Query('cycleId') cycleId?: string,
  ) {
    return this.goalsService.findMyGoals(user.userId, user.organizationId, cycleId);
  }

  @Get('team')
  @RequirePermissions('performance.read')
  @ApiOperation({ summary: 'List team goals (manager)' })
  @ApiQuery({ name: 'cycleId', required: false })
  async findTeamGoals(
    @CurrentUser() user: AuthenticatedUser,
    @Query('cycleId') cycleId?: string,
  ) {
    return this.goalsService.findTeamGoals(user.userId, user.organizationId, cycleId);
  }

  @Get()
  @RequirePermissions('performance.read')
  @ApiOperation({ summary: 'List all goals (admin/HR)' })
  @ApiQuery({ name: 'cycleId', required: false })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('cycleId') cycleId?: string,
  ) {
    return this.goalsService.findAll(user.organizationId, cycleId);
  }

  // ─── Single goal ──────────────────────

  @Get(':id')
  @RequirePermissions('performance.read_own')
  @ApiOperation({ summary: 'Get goal by ID' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.goalsService.findById(user.userId, user.organizationId, id, user.roles);
  }

  // ─── Update ───────────────────────────

  @Patch(':id')
  @RequirePermissions('performance.create_goals')
  @ApiOperation({ summary: 'Update a goal (DRAFT/REJECTED only)' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.update(user.userId, user.organizationId, id, dto);
  }

  @Patch(':id/submit')
  @RequirePermissions('performance.create_goals')
  @ApiOperation({ summary: 'Submit goal for approval (DRAFT → PENDING_APPROVAL)' })
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.goalsService.submit(user.userId, user.organizationId, id);
  }

  @Patch(':id/approve')
  @RequirePermissions('performance.approve_goals')
  @ApiOperation({ summary: 'Approve or reject a goal' })
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveGoalDto,
  ) {
    return this.goalsService.approve(
      user.userId, user.organizationId, id, dto, user.roles,
    );
  }

  // ─── Deactivate ───────────────────────

  @Delete(':id')
  @RequirePermissions('performance.create_goals')
  @ApiOperation({ summary: 'Deactivate a goal (DRAFT/REJECTED only)' })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.goalsService.deactivate(user.userId, user.organizationId, id);
  }

  // ─── Progress ─────────────────────────

  @Post(':id/progress')
  @RequirePermissions('performance.read_own')
  @ApiOperation({ summary: 'Add progress update to a goal' })
  async updateProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateGoalProgressDto,
  ) {
    return this.goalsService.updateProgress(user.userId, user.organizationId, id, dto);
  }

  @Get(':id/progress')
  @RequirePermissions('performance.read_own')
  @ApiOperation({ summary: 'Get goal progress history' })
  async findGoalProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.goalsService.findGoalProgress(
      user.userId, user.organizationId, id, user.roles,
    );
  }
}
