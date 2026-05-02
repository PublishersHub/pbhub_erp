import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationsService } from '../services/organizations.service';
import { UpdateBrandingDto } from '../dto/update-branding.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /**
   * Public — no auth required.
   * Returns the active org's brand fields + name/slug for use by branded auth pages.
   */
  @Get('by-slug/:slug/branding')
  @Public()
  @ApiOperation({ summary: 'Get public branding info for an org by slug (no auth required)' })
  async getBrandingBySlug(@Param('slug') slug: string) {
    return this.organizationsService.findBrandingBySlug(slug);
  }

  /**
   * Admin-only — requires organization.manage permission.
   * Updates branding fields for the caller's active org.
   */
  @Patch('current')
  @ApiBearerAuth()
  @RequirePermissions('organization.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update branding for the current organization (admin only)' })
  async updateBranding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateBrandingDto,
  ) {
    return this.organizationsService.updateBranding(user.organizationId, dto);
  }
}
