import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PerformanceCyclesService } from '../services/performance-cycles.service';
import { CreateCycleDto } from '../dto/create-cycle.dto';
import { UpdateCycleDto } from '../dto/update-cycle.dto';
import { TransitionCycleDto } from '../dto/transition-cycle.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Performance Cycles')
@ApiBearerAuth()
@Controller('performance-cycles')
export class PerformanceCyclesController {
  constructor(private readonly cyclesService: PerformanceCyclesService) {}

  @Post()
  @RequirePermissions('performance.manage')
  @ApiOperation({ summary: 'Create a performance cycle' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCycleDto,
  ) {
    return this.cyclesService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('performance.read')
  @ApiOperation({ summary: 'List all performance cycles' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.cyclesService.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('performance.read')
  @ApiOperation({ summary: 'Get performance cycle by ID' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.cyclesService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('performance.manage')
  @ApiOperation({ summary: 'Update a performance cycle' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCycleDto,
  ) {
    return this.cyclesService.update(user.organizationId, id, dto);
  }

  @Patch(':id/transition')
  @RequirePermissions('performance.manage')
  @ApiOperation({ summary: 'Transition cycle to a new status' })
  async transition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: TransitionCycleDto,
  ) {
    return this.cyclesService.transition(
      user.organizationId,
      id,
      dto.status,
      user.userId,
    );
  }
}
