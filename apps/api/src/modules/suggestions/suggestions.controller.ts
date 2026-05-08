import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SuggestionsService } from './suggestions.service';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import {
  RespondSuggestionDto,
  UpdateSuggestionStatusDto,
} from './dto/respond-suggestion.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../common/types';

@ApiTags('Suggestions')
@ApiBearerAuth()
@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Post()
  @RequirePermissions('suggestion.create')
  @ApiOperation({ summary: 'Submit a new suggestion (named or anonymous)' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSuggestionDto,
  ) {
    return this.suggestionsService.create(user.userId, user.organizationId, dto);
  }

  @Get('my')
  @RequirePermissions('suggestion.read_own')
  @ApiOperation({
    summary:
      'List my non-anonymous suggestions (anonymous rows have no authorId and are intentionally not returned).',
  })
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.suggestionsService.findMine(user.userId, user.organizationId);
  }

  @Get()
  @RequirePermissions('suggestion.manage')
  @ApiOperation({ summary: 'List all suggestions in the organization' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['OPEN', 'IN_REVIEW', 'IMPLEMENTED', 'DECLINED', 'ARCHIVED'],
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
  ) {
    return this.suggestionsService.findAll(user.organizationId, { status });
  }

  @Get(':id')
  @RequirePermissions('suggestion.read_own')
  @ApiOperation({
    summary: 'Get a single suggestion (author or anyone with suggestion.manage)',
  })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.suggestionsService.findById(
      user.userId,
      user.organizationId,
      id,
      user.permissions,
    );
  }

  @Patch(':id/respond')
  @RequirePermissions('suggestion.manage')
  @ApiOperation({
    summary:
      'Post a response on a suggestion (sets responseBody, respondedBy, respondedAt, status).',
  })
  async respond(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RespondSuggestionDto,
  ) {
    return this.suggestionsService.respond(
      user.userId,
      user.organizationId,
      id,
      dto,
    );
  }

  @Patch(':id/status')
  @RequirePermissions('suggestion.manage')
  @ApiOperation({ summary: 'Change just the status of a suggestion (e.g. archive).' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSuggestionStatusDto,
  ) {
    return this.suggestionsService.updateStatus(user.organizationId, id, dto);
  }
}
