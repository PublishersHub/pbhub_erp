import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminMailService } from './admin-mail.service';
import { SendMailDto } from './dto/send-mail.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../common/types';

@ApiTags('Admin Mail')
@ApiBearerAuth()
@Controller('admin-mail')
export class AdminMailController {
  constructor(private readonly adminMailService: AdminMailService) {}

  @Post('send')
  @RequirePermissions('admin_mail.send')
  @ApiOperation({
    summary: 'Compose and send an admin email to selected employees',
  })
  async send(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMailDto,
  ) {
    return this.adminMailService.send(user.userId, user.organizationId, dto);
  }
}
