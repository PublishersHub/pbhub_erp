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
import { PerformanceNotesService } from '../services/performance-notes.service';
import {
  CreatePerformanceNoteDto,
  UpdatePerformanceNoteDto,
} from '../dto/create-performance-note.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Performance Notes')
@ApiBearerAuth()
@Controller('performance')
export class PerformanceNotesController {
  constructor(private readonly notesService: PerformanceNotesService) {}

  // ─── Create note for an employee ──────

  @Post('employees/:employeeId/notes')
  @RequirePermissions('performance.review')
  @ApiOperation({
    summary:
      'Add a manager note about an employee. Requires performance.review or performance.manage.',
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: CreatePerformanceNoteDto,
  ) {
    return this.notesService.create(
      user.userId,
      user.organizationId,
      employeeId,
      dto,
    );
  }

  // ─── List notes for an employee ───────

  @Get('employees/:employeeId/notes')
  @RequirePermissions('performance.read_own')
  @ApiOperation({
    summary:
      'List notes about an employee. Reviewers/managers/HR see all; the subject only sees public notes.',
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
  ) {
    return this.notesService.listForEmployee(
      user.userId,
      user.organizationId,
      employeeId,
      user.permissions,
      user.roles,
    );
  }

  // ─── Update (author only) ─────────────

  @Patch('notes/:id')
  @RequirePermissions('performance.review')
  @ApiOperation({ summary: 'Edit a note (author only)' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePerformanceNoteDto,
  ) {
    return this.notesService.update(user.userId, user.organizationId, id, dto);
  }

  // ─── Delete (author or admin) ─────────

  @Delete('notes/:id')
  @RequirePermissions('performance.review')
  @ApiOperation({ summary: 'Delete a note (author or admin)' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notesService.remove(
      user.userId,
      user.organizationId,
      id,
      user.roles,
      user.permissions,
    );
  }
}
