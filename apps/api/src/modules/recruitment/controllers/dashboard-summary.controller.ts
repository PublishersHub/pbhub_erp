import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardSummaryService } from '../services/dashboard-summary.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Recruitment Dashboard')
@ApiBearerAuth()
@Controller('recruitment')
export class DashboardSummaryController {
  constructor(private readonly service: DashboardSummaryService) {}

  @Get('dashboard-summary')
  @RequirePermissions('recruitment.read')
  @ApiOperation({ summary: 'Get recruitment dashboard summary' })
  async getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getSummary(user.organizationId);
  }
}
