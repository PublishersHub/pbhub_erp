import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PerformanceReviewsService } from '../services/performance-reviews.service';
import { SubmitSelfReviewDto } from '../dto/submit-self-review.dto';
import { SubmitManagerReviewDto } from '../dto/submit-manager-review.dto';
import { CalibrateReviewDto } from '../dto/calibrate-review.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Performance Reviews')
@ApiBearerAuth()
@Controller('performance-reviews')
export class PerformanceReviewsController {
  constructor(private readonly reviewsService: PerformanceReviewsService) {}

  // ─── Named routes (before :id) ────────

  @Get('my/:cycleId')
  @RequirePermissions('performance.read_own')
  @ApiOperation({ summary: 'Get my review for a cycle' })
  async findMyReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cycleId') cycleId: string,
  ) {
    return this.reviewsService.findMyReview(user.userId, user.organizationId, cycleId);
  }

  @Get('team')
  @RequirePermissions('performance.review')
  @ApiOperation({ summary: 'List team reviews (manager)' })
  @ApiQuery({ name: 'cycleId', required: false })
  async findTeamReviews(
    @CurrentUser() user: AuthenticatedUser,
    @Query('cycleId') cycleId?: string,
  ) {
    return this.reviewsService.findTeamReviews(user.userId, user.organizationId, cycleId);
  }

  @Get()
  @RequirePermissions('performance.read')
  @ApiOperation({ summary: 'List all reviews (admin/HR)' })
  @ApiQuery({ name: 'cycleId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('cycleId') cycleId?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.reviewsService.findAll(user.organizationId, cycleId, employeeId);
  }

  // ─── Single review ───────────────────

  @Get(':id')
  @RequirePermissions('performance.read')
  @ApiOperation({ summary: 'Get review by ID' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.reviewsService.findById(user.organizationId, id);
  }

  // ─── Self review ─────────────────────

  @Patch(':id/self-review')
  @RequirePermissions('performance.read_own')
  @ApiOperation({ summary: 'Save or submit self review' })
  async submitSelfReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitSelfReviewDto,
  ) {
    return this.reviewsService.submitSelfReview(
      user.userId, user.organizationId, id, dto,
    );
  }

  // ─── Manager review ──────────────────

  @Patch(':id/manager-review')
  @RequirePermissions('performance.review')
  @ApiOperation({ summary: 'Save or submit manager review' })
  async submitManagerReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitManagerReviewDto,
  ) {
    return this.reviewsService.submitManagerReview(
      user.userId, user.organizationId, id, dto, user.roles,
    );
  }

  // ─── HR Calibration ──────────────────

  @Patch(':id/calibrate')
  @RequirePermissions('performance.manage')
  @ApiOperation({ summary: 'Calibrate final rating (HR)' })
  async calibrate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CalibrateReviewDto,
  ) {
    return this.reviewsService.calibrate(
      user.userId, user.organizationId, id, dto,
    );
  }
}
