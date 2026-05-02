import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from '../services/roles.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions('role.manage')
  @ApiOperation({ summary: 'Create a new custom org role' })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(user.organizationId, dto);
  }

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

  @Patch(':id')
  @RequirePermissions('role.manage')
  @ApiOperation({ summary: 'Rename or update description of a custom org role' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.updateRole(user.organizationId, id, dto);
  }

  @Patch(':id/permissions')
  @RequirePermissions('role.manage')
  @ApiOperation({ summary: 'Replace the full permission set on a role' })
  async updatePermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rolesService.updateRolePermissions(user.organizationId, id, dto.permissionCodes);
  }

  @Delete(':id')
  @RequirePermissions('role.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate (soft-delete) a custom org role' })
  async deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rolesService.deactivateRole(user.organizationId, id);
  }
}
