import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { PasswordResetService } from '../services/password-reset.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { SelectOrganizationDto } from '../dto/select-organization.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Log in with email + password. No organization required.' })
  @ApiBody({ type: LoginDto })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('select-organization')
  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Pick an org after multi-org login. Returns an access token.' })
  @ApiBody({ type: SelectOrganizationDto })
  async selectOrganization(
    @CurrentUser() ctx: { accountId: string; tokenId: string; refreshToken: string },
    @Body() dto: SelectOrganizationDto,
  ) {
    return this.authService.selectOrganization(
      ctx.accountId,
      ctx.tokenId,
      ctx.refreshToken,
      dto.organizationId,
    );
  }

  @Post('switch-organization/:orgId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mid-session org switch. Reuses the existing refresh token.' })
  async switchOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orgId', new ParseUUIDPipe()) orgId: string,
  ) {
    return this.authService.switchOrganization(user.accountId, orgId);
  }

  @Post('refresh')
  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Rotate refresh token + mint new access token.' })
  @ApiBody({ type: RefreshTokenDto })
  async refresh(
    @CurrentUser() ctx: { accountId: string; tokenId: string; refreshToken: string },
    @Body() dto: RefreshTokenDto,
  ) {
    return this.authService.refresh(
      ctx.accountId,
      ctx.tokenId,
      ctx.refreshToken,
      dto.organizationId,
    );
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the supplied refresh token.' })
  @ApiBody({ type: RefreshTokenDto })
  async logout(@Body() dto: RefreshTokenDto, @CurrentUser() user: AuthenticatedUser) {
    await this.authService.logout(dto.refreshToken, user.accountId);
    return { message: 'Logged out' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the active account + membership context.' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request a password reset email (does not leak existence)' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.passwordResetService.forgotPassword(dto.email);
    return {
      message: 'If that email is registered, a reset link has been sent.',
      ...(result.__devToken ? { __devToken: result.__devToken } : {}),
    };
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reset password using a token from the email' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.passwordResetService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password reset. Please sign in with your new password.' };
  }
}
