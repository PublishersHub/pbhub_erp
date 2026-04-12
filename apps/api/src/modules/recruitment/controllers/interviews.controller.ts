import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InterviewsService } from '../services/interviews.service';
import { ScheduleInterviewDto } from '../dto/schedule-interview.dto';
import { RescheduleInterviewDto } from '../dto/reschedule-interview.dto';
import { CancelInterviewDto } from '../dto/cancel-interview.dto';
import { SubmitFeedbackDto } from '../dto/submit-feedback.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Interviews')
@ApiBearerAuth()
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly service: InterviewsService) {}

  @Post()
  @RequirePermissions('recruitment.interview.manage')
  @ApiOperation({ summary: 'Schedule an interview' })
  async schedule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ScheduleInterviewDto,
  ) {
    return this.service.schedule(user.userId, user.organizationId, dto);
  }

  @Get('by-application/:applicationId')
  @RequirePermissions('recruitment.read')
  @ApiOperation({ summary: 'List interviews for an application' })
  async findByApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationId') applicationId: string,
  ) {
    return this.service.findByApplication(user.organizationId, applicationId);
  }

  @Get(':id')
  @RequirePermissions('recruitment.read')
  @ApiOperation({ summary: 'Get interview detail' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.findById(user.organizationId, id);
  }

  @Patch(':id/reschedule')
  @RequirePermissions('recruitment.interview.manage')
  @ApiOperation({ summary: 'Reschedule an interview' })
  async reschedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RescheduleInterviewDto,
  ) {
    return this.service.reschedule(user.userId, user.organizationId, id, dto);
  }

  @Patch(':id/cancel')
  @RequirePermissions('recruitment.interview.manage')
  @ApiOperation({ summary: 'Cancel an interview' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelInterviewDto,
  ) {
    return this.service.cancel(user.userId, user.organizationId, id, dto);
  }

  @Post(':id/feedback')
  @RequirePermissions('recruitment.interview.manage')
  @ApiOperation({ summary: 'Submit interview feedback as a panelist' })
  async submitFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitFeedbackDto,
  ) {
    return this.service.submitFeedback(
      user.userId,
      user.organizationId,
      id,
      dto,
    );
  }
}
