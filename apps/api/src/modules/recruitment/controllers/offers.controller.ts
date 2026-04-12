import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OffersService } from '../services/offers.service';
import { HireService } from '../services/hire.service';
import { CreateOfferDto } from '../dto/create-offer.dto';
import { UpdateOfferDto } from '../dto/update-offer.dto';
import { RespondOfferDto } from '../dto/respond-offer.dto';
import { RescindOfferDto } from '../dto/rescind-offer.dto';
import { HireCandidateDto } from '../dto/hire-candidate.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Offers')
@ApiBearerAuth()
@Controller('offers')
export class OffersController {
  constructor(
    private readonly offersService: OffersService,
    private readonly hireService: HireService,
  ) {}

  @Post()
  @RequirePermissions('recruitment.offer.manage')
  @ApiOperation({ summary: 'Create an offer (DRAFT)' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offersService.create(user.userId, user.organizationId, dto);
  }

  @Get('by-application/:applicationId')
  @RequirePermissions('recruitment.read')
  @ApiOperation({ summary: 'List offers for an application' })
  async findByApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationId') applicationId: string,
  ) {
    return this.offersService.findByApplication(
      user.organizationId,
      applicationId,
    );
  }

  @Get(':id')
  @RequirePermissions('recruitment.read')
  @ApiOperation({ summary: 'Get offer detail' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.offersService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('recruitment.offer.manage')
  @ApiOperation({ summary: 'Update a DRAFT offer' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.offersService.update(user.organizationId, id, dto);
  }

  @Patch(':id/extend')
  @RequirePermissions('recruitment.offer.manage')
  @ApiOperation({ summary: 'Extend an offer (DRAFT → EXTENDED)' })
  async extend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.offersService.extend(user.userId, user.organizationId, id);
  }

  @Patch(':id/respond')
  @RequirePermissions('recruitment.offer.manage')
  @ApiOperation({ summary: 'Record candidate response (ACCEPTED / DECLINED)' })
  async respond(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RespondOfferDto,
  ) {
    return this.offersService.respond(user.userId, user.organizationId, id, dto);
  }

  @Patch(':id/rescind')
  @RequirePermissions('recruitment.offer.manage')
  @ApiOperation({ summary: 'Rescind an offer' })
  async rescind(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RescindOfferDto,
  ) {
    return this.offersService.rescind(user.userId, user.organizationId, id, dto);
  }

  @Post(':id/hire')
  @RequirePermissions('recruitment.hire')
  @ApiOperation({
    summary: 'Convert an ACCEPTED offer into a new employee record',
  })
  async hire(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: HireCandidateDto,
  ) {
    return this.hireService.hireAndNotify(
      user.userId,
      user.organizationId,
      id,
      dto,
    );
  }
}
