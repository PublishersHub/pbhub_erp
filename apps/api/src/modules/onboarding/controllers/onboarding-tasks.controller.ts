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
import { OnboardingTasksService } from '../services/onboarding-tasks.service';
import { UpdateTaskStatusDto } from '../dto/update-task-status.dto';
import { ReassignTaskDto } from '../dto/reassign-task.dto';
import { UploadTaskDocumentDto } from '../dto/upload-task-document.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Onboarding Tasks')
@ApiBearerAuth()
@Controller('onboarding-tasks')
export class OnboardingTasksController {
  constructor(private readonly service: OnboardingTasksService) {}

  @Get('my')
  @RequirePermissions('onboarding.task.update')
  @ApiOperation({ summary: 'My assigned onboarding tasks' })
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findMine(user.userId, user.organizationId);
  }

  @Patch(':id/status')
  @RequirePermissions('onboarding.task.update')
  @ApiOperation({ summary: 'Update task status' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.service.updateStatus(
      user.userId,
      user.organizationId,
      user.roles,
      id,
      dto,
    );
  }

  @Patch(':id/assignee')
  @RequirePermissions('onboarding.instance.manage')
  @ApiOperation({ summary: 'Reassign a task to another employee' })
  async reassign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReassignTaskDto,
  ) {
    return this.service.reassign(user.organizationId, id, dto);
  }

  @Post(':id/documents')
  @RequirePermissions('onboarding.task.update')
  @ApiOperation({ summary: 'Attach a document to a task' })
  async addDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UploadTaskDocumentDto,
  ) {
    return this.service.addDocument(user.userId, user.organizationId, id, dto);
  }

  @Get(':id/documents')
  @RequirePermissions('onboarding.read')
  @ApiOperation({ summary: 'List task documents' })
  async listDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.listDocuments(user.organizationId, id);
  }

  @Delete(':id/documents/:docId')
  @RequirePermissions('onboarding.instance.manage')
  @ApiOperation({ summary: 'Remove a task document' })
  async removeDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    return this.service.removeDocument(user.organizationId, id, docId);
  }
}
