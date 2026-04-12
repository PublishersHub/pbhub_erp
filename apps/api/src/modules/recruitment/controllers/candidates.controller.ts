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
import { CandidatesService } from '../services/candidates.service';
import {
  CreateCandidateDto,
  UpdateCandidateBlacklistDto,
} from '../dto/create-candidate.dto';
import { UpdateCandidateDto } from '../dto/update-candidate.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Candidates')
@ApiBearerAuth()
@Controller('candidates')
export class CandidatesController {
  constructor(private readonly service: CandidatesService) {}

  @Post()
  @RequirePermissions('recruitment.candidate.manage')
  @ApiOperation({ summary: 'Create a candidate' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCandidateDto,
  ) {
    return this.service.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('recruitment.read')
  @ApiOperation({ summary: 'List candidates' })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(user.organizationId, search);
  }

  @Get(':id')
  @RequirePermissions('recruitment.read')
  @ApiOperation({ summary: 'Get candidate detail' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.findById(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('recruitment.candidate.manage')
  @ApiOperation({ summary: 'Update candidate' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCandidateDto,
  ) {
    return this.service.update(user.organizationId, id, dto);
  }

  @Patch(':id/blacklist')
  @RequirePermissions('recruitment.candidate.manage')
  @ApiOperation({ summary: 'Set blacklist status on a candidate' })
  async setBlacklist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCandidateBlacklistDto,
  ) {
    return this.service.setBlacklist(user.organizationId, id, dto);
  }
}
