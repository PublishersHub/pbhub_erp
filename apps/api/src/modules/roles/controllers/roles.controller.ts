import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from '../services/roles.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('role.read')
  @ApiOperation({ summary: 'List all roles visible to the current organization' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    const roles = await this.rolesService.findAllForOrganization(user.organizationId);

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.userRoles,
      permissions: role.rolePermissions.map((rp) => rp.permission.code),
    }));
  }

  @Get('permissions')
  @RequirePermissions('role.read')
  @ApiOperation({ summary: 'List all available permissions' })
  async findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Get(':id')
  @RequirePermissions('role.read')
  @ApiOperation({ summary: 'Get a role with its permissions' })
  async findOne(@Param('id') id: string) {
    const role = await this.rolesService.findByIdWithPermissions(id);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map((rp) => ({
        code: rp.permission.code,
        name: rp.permission.name,
        module: rp.permission.module,
      })),
    };
  }
}
