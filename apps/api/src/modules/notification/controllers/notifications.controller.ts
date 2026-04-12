import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from '../services/notifications.service';
import { NotificationPreferencesService } from '../services/notification-preferences.service';
import { UpdateNotificationPreferenceDto } from '../dto/update-notification-preference.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  // ─── Inbox ──────────────────────────────

  @Get()
  @RequirePermissions('notification.read_own')
  @ApiOperation({ summary: 'List my notifications' })
  @ApiQuery({ name: 'unread', required: false, type: Boolean })
  @ApiQuery({ name: 'archived', required: false, type: Boolean })
  async findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('unread') unread?: string,
    @Query('archived') archived?: string,
  ) {
    return this.notificationsService.findMine(user.userId, user.organizationId, {
      unread: unread === 'true',
      archived: archived === 'true',
    });
  }

  @Get('unread-count')
  @RequirePermissions('notification.read_own')
  @ApiOperation({ summary: 'Get my unread notification count' })
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(
      user.userId,
      user.organizationId,
    );
  }

  @Patch('read-all')
  @RequirePermissions('notification.read_own')
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(
      user.userId,
      user.organizationId,
    );
  }

  // ─── Preferences ────────────────────────

  @Get('preferences')
  @RequirePermissions('notification.read_own')
  @ApiOperation({ summary: 'Get my notification preferences' })
  async findMyPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.preferencesService.findMine(user.userId);
  }

  @Patch('preferences')
  @RequirePermissions('notification.read_own')
  @ApiOperation({ summary: 'Update my notification preferences' })
  async updateMyPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.preferencesService.updateMine(user.userId, dto);
  }

  // ─── Admin ──────────────────────────────

  @Get('all')
  @RequirePermissions('notification.read')
  @ApiOperation({ summary: 'List all notifications in the organization (admin)' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.findAll(user.organizationId);
  }

  // ─── Per-notification (id-based) ────────
  // IMPORTANT: these routes come AFTER static routes like /unread-count and
  // /read-all so Nest does not match them as `:id`.

  @Get(':id')
  @RequirePermissions('notification.read_own')
  @ApiOperation({ summary: 'Get my notification detail' })
  async findMineById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.findMineById(
      user.userId,
      user.organizationId,
      id,
    );
  }

  @Patch(':id/read')
  @RequirePermissions('notification.read_own')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markRead(
      user.userId,
      user.organizationId,
      id,
    );
  }

  @Patch(':id/archive')
  @RequirePermissions('notification.read_own')
  @ApiOperation({ summary: 'Archive a notification' })
  async archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.archive(
      user.userId,
      user.organizationId,
      id,
    );
  }
}
