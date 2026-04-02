import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LeavePoliciesController } from './controllers/leave-policies.controller';
import { LeaveRequestsController } from './controllers/leave-requests.controller';
import { LeaveBalancesController } from './controllers/leave-balances.controller';
import { HolidaysController } from './controllers/holidays.controller';
import { LeavePoliciesService } from './services/leave-policies.service';
import { LeaveRequestsService } from './services/leave-requests.service';
import { LeaveBalancesService } from './services/leave-balances.service';
import { HolidaysService } from './services/holidays.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    LeavePoliciesController,
    LeaveRequestsController,
    LeaveBalancesController,
    HolidaysController,
  ],
  providers: [
    LeavePoliciesService,
    LeaveRequestsService,
    LeaveBalancesService,
    HolidaysService,
  ],
  exports: [LeaveBalancesService],
})
export class LeaveModule {}
