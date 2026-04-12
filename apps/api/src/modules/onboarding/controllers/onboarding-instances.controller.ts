import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OnboardingInstanceStatus } from '@prisma/client';
import { OnboardingInstancesService } from '../services/onboarding-instances.service';
import { CreateOnboardingInstanceDto } from '../dto/create-onboarding-instance.dto';
import { CancelOnboardingInstanceDto } from '../dto/cancel-onboarding-instance.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Onboarding Instances')
@ApiBearerAuth()
@Controller('onboarding-instances')
export class OnboardingInstancesController {
  constructor(private readonly service: OnboardingInstancesService) {}

  @Post()
  @RequirePermissions('onboarding.instance.manage')
  @ApiOperation({ summary: 'Manually start onboarding for an employee' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOnboardingInstanceDto,
  ) {
    return this.service.createFromDto(user.userId, user.organizationId, dto);
  }

  @Get('my')
  @RequirePermissions('onboarding.read_own')
  @ApiOperation({ summary: 'Get my onboarding instance (as new hire)' })
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findMine(user.userId, user.organizationId);
  }

  @Get()
  @RequirePermissions('onboarding.read')
  @ApiOperation({ summary: 'List onboarding instances' })
  @ApiQuery({ name: 'status', required: false, enum: OnboardingInstanceStatus })
  @ApiQuery({ name: 'employeeId', required: false })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: OnboardingInstanceStatus,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.service.findAll(user.organizationId, { status, employeeId });
  }

  @Get(':id')
  @RequirePermissions('onboarding.read')
  @ApiOperation({ summary: 'Get instance detail with tasks' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.findById(user.organizationId, id);
  }

  @Patch(':id/cancel')
  @RequirePermissions('onboarding.instance.manage')
  @ApiOperation({ summary: 'Cancel an onboarding instance' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelOnboardingInstanceDto,
  ) {
    return this.service.cancel(user.organizationId, id, dto);
  }
}
