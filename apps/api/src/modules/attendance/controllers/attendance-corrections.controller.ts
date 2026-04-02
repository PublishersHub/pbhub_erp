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
import { AttendanceCorrectionsService } from '../services/attendance-corrections.service';
import { CreateCorrectionRequestDto } from '../dto/create-correction-request.dto';
import { ReviewCorrectionRequestDto } from '../dto/review-correction-request.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Attendance Corrections')
@ApiBearerAuth()
@Controller('attendance-corrections')
export class AttendanceCorrectionsController {
  constructor(
    private readonly correctionsService: AttendanceCorrectionsService,
  ) {}

  @Post()
  @RequirePermissions('attendance.read_own')
  @ApiOperation({ summary: 'Submit a correction request for a past attendance day' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCorrectionRequestDto,
  ) {
    return this.correctionsService.create(
      user.userId,
      user.organizationId,
      dto,
    );
  }

  @Get('my')
  @RequirePermissions('attendance.read_own')
  @ApiOperation({ summary: 'List my correction requests' })
  async findMyRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.correctionsService.findMyRequests(
      user.userId,
      user.organizationId,
    );
  }

  @Get()
  @RequirePermissions('attendance.correct')
  @ApiOperation({ summary: 'List all correction requests (admin/HR)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
  ) {
    return this.correctionsService.findAll(user.organizationId, status);
  }

  @Patch(':id/review')
  @RequirePermissions('attendance.correct')
  @ApiOperation({ summary: 'Approve or reject a correction request' })
  async review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewCorrectionRequestDto,
  ) {
    return this.correctionsService.review(
      user.userId,
      user.organizationId,
      id,
      dto,
    );
  }
}
