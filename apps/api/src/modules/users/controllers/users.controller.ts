import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('user.read')
  @ApiOperation({ summary: 'List org users (memberships) with their roles' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listMembersWithRoles(user.organizationId);
  }

  @Get('orphan-employees')
  @RequirePermissions('user.read')
  @ApiOperation({
    summary:
      'List active employees that do not yet have a linked User login — surfaces them on /settings/users so HR can invite them.',
  })
  async findOrphanEmployees(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listEmployeesWithoutUser(user.organizationId);
  }

  @Post(':id/roles')
  @RequirePermissions('user.manage_roles')
  @ApiOperation({ summary: 'Assign a role to a user' })
  async assignRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(user.organizationId, id, dto.roleId);
  }

  @Delete(':userId/roles/:roleId')
  @RequirePermissions('user.manage_roles')
  @ApiOperation({ summary: 'Remove a role from a user' })
  async removeRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('roleId', new ParseUUIDPipe()) roleId: string,
  ) {
    await this.usersService.removeRole(user.organizationId, userId, roleId);
    return { message: 'Role removed' };
  }

  @Patch(':id/password')
  @RequirePermissions('user.manage_roles')
  @ApiOperation({ summary: 'Admin: set a member password (revokes existing sessions)' })
  async setPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { password: string },
  ) {
    return this.usersService.adminSetPassword(user.organizationId, id, body.password);
  }

  @Patch(':id/active')
  @RequirePermissions('user.manage_roles')
  @ApiOperation({ summary: 'Activate or deactivate a member' })
  async setActive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.usersService.setUserActive(user.organizationId, id, !!body.isActive);
  }

  @Patch(':id/name')
  @RequirePermissions('user.manage_roles')
  @ApiOperation({ summary: 'Update a member display name (Account + linked Employee)' })
  async updateName(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { firstName: string; lastName: string },
  ) {
    return this.usersService.updateAccountName(
      user.organizationId,
      id,
      body.firstName,
      body.lastName,
    );
  }
}
