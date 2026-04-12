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
import { OnboardingTemplatesService } from '../services/onboarding-templates.service';
import { CreateOnboardingTemplateDto } from '../dto/create-onboarding-template.dto';
import { UpdateOnboardingTemplateDto } from '../dto/update-onboarding-template.dto';
import { CreateTemplateTaskDto } from '../dto/create-template-task.dto';
import { UpdateTemplateTaskDto } from '../dto/update-template-task.dto';
import { ReorderTemplateTasksDto } from '../dto/reorder-template-tasks.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Onboarding Templates')
@ApiBearerAuth()
@Controller('onboarding-templates')
export class OnboardingTemplatesController {
  constructor(private readonly service: OnboardingTemplatesService) {}

  @Post()
  @RequirePermissions('onboarding.template.manage')
  @ApiOperation({ summary: 'Create an onboarding template' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOnboardingTemplateDto,
  ) {
    return this.service.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('onboarding.read')
  @ApiOperation({ summary: 'List onboarding templates' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('onboarding.read')
  @ApiOperation({ summary: 'Get template detail with tasks' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.findById(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('onboarding.template.manage')
  @ApiOperation({ summary: 'Update a template' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOnboardingTemplateDto,
  ) {
    return this.service.update(user.organizationId, id, dto);
  }

  @Post(':id/tasks')
  @RequirePermissions('onboarding.template.manage')
  @ApiOperation({ summary: 'Add a task to a template' })
  async createTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') templateId: string,
    @Body() dto: CreateTemplateTaskDto,
  ) {
    return this.service.createTask(user.organizationId, templateId, dto);
  }

  @Patch(':id/tasks/:taskId')
  @RequirePermissions('onboarding.template.manage')
  @ApiOperation({ summary: 'Update a template task' })
  async updateTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') templateId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTemplateTaskDto,
  ) {
    return this.service.updateTask(
      user.organizationId,
      templateId,
      taskId,
      dto,
    );
  }

  @Delete(':id/tasks/:taskId')
  @RequirePermissions('onboarding.template.manage')
  @ApiOperation({ summary: 'Remove a template task' })
  async deleteTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') templateId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.service.deleteTask(user.organizationId, templateId, taskId);
  }

  @Post(':id/tasks/reorder')
  @RequirePermissions('onboarding.template.manage')
  @ApiOperation({ summary: 'Reorder template tasks' })
  async reorderTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') templateId: string,
    @Body() dto: ReorderTemplateTasksDto,
  ) {
    return this.service.reorderTasks(user.organizationId, templateId, dto);
  }
}
