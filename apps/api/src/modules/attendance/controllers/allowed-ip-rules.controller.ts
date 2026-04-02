import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IpRestrictionService } from '../services/ip-restriction.service';
import { CreateAllowedIpRuleDto } from '../dto/create-allowed-ip-rule.dto';
import { UpdateAllowedIpRuleDto } from '../dto/update-allowed-ip-rule.dto';
import { SetEmployeeOverrideDto } from '../dto/set-employee-override.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('IP Restriction')
@ApiBearerAuth()
@Controller()
export class AllowedIpRulesController {
  constructor(private readonly ipRestrictionService: IpRestrictionService) {}

  // ─── Allowed IP Rules ────────────────────

  @Post('allowed-ip-rules')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Add an allowed IP rule' })
  async createRule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAllowedIpRuleDto,
  ) {
    return this.ipRestrictionService.createRule(user.organizationId, dto);
  }

  @Get('allowed-ip-rules')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'List allowed IP rules' })
  async findAllRules(@CurrentUser() user: AuthenticatedUser) {
    return this.ipRestrictionService.findAllRules(user.organizationId);
  }

  @Patch('allowed-ip-rules/:id')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Update an allowed IP rule' })
  async updateRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAllowedIpRuleDto,
  ) {
    return this.ipRestrictionService.updateRule(user.organizationId, id, dto);
  }

  @Delete('allowed-ip-rules/:id')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Delete an allowed IP rule' })
  async deleteRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.ipRestrictionService.deleteRule(user.organizationId, id);
  }

  // ─── Employee Attendance Overrides ───────

  @Put('employees/:id/attendance-override')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Set attendance override for an employee (e.g. IP exemption)' })
  async setOverride(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') employeeId: string,
    @Body() dto: SetEmployeeOverrideDto,
  ) {
    return this.ipRestrictionService.setOverride(
      user.organizationId,
      employeeId,
      dto,
    );
  }

  @Get('employees/:id/attendance-override')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Get attendance override for an employee' })
  async getOverride(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') employeeId: string,
  ) {
    return this.ipRestrictionService.getOverride(user.organizationId, employeeId);
  }

  @Delete('employees/:id/attendance-override')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Remove attendance override for an employee' })
  async removeOverride(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') employeeId: string,
  ) {
    return this.ipRestrictionService.removeOverride(user.organizationId, employeeId);
  }
}
