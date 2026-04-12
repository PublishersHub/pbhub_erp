import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationTemplatesService } from '../services/notification-templates.service';
import { CreateNotificationTemplateDto } from '../dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from '../dto/update-notification-template.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Notification Templates')
@ApiBearerAuth()
@Controller('notification-templates')
export class NotificationTemplatesController {
  constructor(
    private readonly templatesService: NotificationTemplatesService,
  ) {}

  @Post()
  @RequirePermissions('notification.manage')
  @ApiOperation({ summary: 'Create notification template' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateNotificationTemplateDto,
  ) {
    return this.templatesService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('notification.manage')
  @ApiOperation({ summary: 'List notification templates' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.templatesService.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('notification.manage')
  @ApiOperation({ summary: 'Get notification template' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.templatesService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('notification.manage')
  @ApiOperation({ summary: 'Update notification template' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ) {
    return this.templatesService.update(user.organizationId, id, dto);
  }
}
