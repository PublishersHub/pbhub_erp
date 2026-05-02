import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { InvitationsService } from '../services/invitations.service';
import { CreateInvitationDto } from '../dto/create-invitation.dto';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  // ─── Admin: create invitation ──────────────────────────────────────────────

  @Post()
  @ApiBearerAuth()
  @RequirePermissions('user.create')
  @ApiOperation({ summary: 'Invite a new user by email (admin only)' })
  async createInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.createInvitation(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  // ─── Admin: list invitations ───────────────────────────────────────────────

  @Get()
  @ApiBearerAuth()
  @RequirePermissions('user.create')
  @ApiOperation({ summary: 'List invitations for the current org (admin only)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'] })
  async listInvitations(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
  ) {
    return this.invitationsService.listInvitations(user.organizationId, status);
  }

  // ─── Public: get invitation context by token ───────────────────────────────

  @Get('by-token/:token')
  @Public()
  @ApiOperation({ summary: 'Get invitation context by token (public)' })
  async getInvitationByToken(@Param('token') token: string) {
    return this.invitationsService.getInvitationByToken(token);
  }

  // ─── Public: accept invitation ─────────────────────────────────────────────

  @Post('accept')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation and set password (public)' })
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.invitationsService.acceptInvitation(dto);
  }

  // ─── Admin: revoke invitation ──────────────────────────────────────────────

  @Post(':id/revoke')
  @ApiBearerAuth()
  @RequirePermissions('user.create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a pending invitation (admin only)' })
  async revokeInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.invitationsService.revokeInvitation(user.organizationId, id);
    return { message: 'Invitation revoked' };
  }
}
