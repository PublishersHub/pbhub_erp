import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { UpdateAccountDto } from '../dto/update-account.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Account')
@ApiBearerAuth()
@Controller('account')
export class AccountController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current account profile' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMyAccount(user.accountId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the current account (name + email)' })
  @ApiBody({ type: UpdateAccountDto })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.authService.updateMyAccount(user.accountId, dto);
  }

  @Post('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change the current account password' })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changeMyPassword(user.accountId, dto);
    return { message: 'Password updated. Other sessions have been signed out.' };
  }
}
