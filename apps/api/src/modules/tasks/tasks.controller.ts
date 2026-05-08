import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../common/types';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @RequirePermissions('task.create')
  @ApiOperation({ summary: 'Create and assign a task' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(user.userId, user.organizationId, dto);
  }

  @Get('my')
  @RequirePermissions('task.read_own')
  @ApiOperation({ summary: 'List my tasks (assignee=me, or role=creator)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['assignee', 'creator'],
    description: 'assignee (default) or creator',
  })
  async findMy(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('role') role?: string,
  ) {
    return this.tasksService.findMyTasks(user.userId, user.organizationId, {
      status,
      role,
    });
  }

  @Get()
  @RequirePermissions('task.read')
  @ApiOperation({ summary: 'List all tasks in the organization' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  })
  @ApiQuery({ name: 'assigneeId', required: false })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.tasksService.findAll(user.organizationId, {
      status,
      assigneeId,
    });
  }

  @Get(':id')
  @RequirePermissions('task.read_own')
  @ApiOperation({ summary: 'Get task detail (assignee, creator, or admin)' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.tasksService.findById(
      user.userId,
      user.organizationId,
      id,
      user.permissions,
    );
  }

  @Patch(':id')
  @RequirePermissions('task.read_own')
  @ApiOperation({
    summary:
      'Update a task. Assignee may only change status; creator/admin can change anything.',
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(
      user.userId,
      user.organizationId,
      id,
      dto,
      user.permissions,
    );
  }

  @Patch(':id/complete')
  @RequirePermissions('task.read_own')
  @ApiOperation({ summary: 'Mark a task as completed' })
  async markComplete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.tasksService.markComplete(
      user.userId,
      user.organizationId,
      id,
      user.permissions,
    );
  }

  @Delete(':id')
  @RequirePermissions('task.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.tasksService.remove(user.organizationId, id);
  }
}
