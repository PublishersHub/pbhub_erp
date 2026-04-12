import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { HolidaysService } from '../services/holidays.service';
import { CreateHolidayDto } from '../dto/create-holiday.dto';
import { UpdateHolidayDto } from '../dto/update-holiday.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Holidays')
@ApiBearerAuth()
@Controller('holidays')
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Post()
  @RequirePermissions('leave.manage')
  @ApiOperation({ summary: 'Create a holiday' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHolidayDto,
  ) {
    return this.holidaysService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('leave.read_own')
  @ApiOperation({ summary: 'List holidays' })
  @ApiQuery({ name: 'year', required: false, example: 2026 })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('year') year?: string,
  ) {
    return this.holidaysService.findAll(user.organizationId, this.parseYear(year));
  }

  @Get(':id')
  @RequirePermissions('leave.read_own')
  @ApiOperation({ summary: 'Get holiday by ID' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.holidaysService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('leave.manage')
  @ApiOperation({ summary: 'Update a holiday' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateHolidayDto,
  ) {
    return this.holidaysService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('leave.manage')
  @ApiOperation({ summary: 'Deactivate a holiday (soft delete)' })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.holidaysService.deactivate(user.organizationId, id);
  }

  // ─── Helpers ──────────────────────────

  private parseYear(value?: string): number | undefined {
    if (value === undefined) return undefined;
    const year = parseInt(value, 10);
    if (isNaN(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('year must be a valid number between 2000 and 2100');
    }
    return year;
  }
}
