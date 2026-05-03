import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AttendancePoliciesController } from './controllers/attendance-policies.controller';
import { AttendanceController } from './controllers/attendance.controller';
import { AllowedIpRulesController } from './controllers/allowed-ip-rules.controller';
import { AttendanceCorrectionsController } from './controllers/attendance-corrections.controller';
import { AttendanceReportsController } from './controllers/attendance-reports.controller';
import { AttendanceExportController } from './controllers/attendance-export.controller';
import { AttendancePoliciesService } from './services/attendance-policies.service';
import { AttendanceService } from './services/attendance.service';
import { IpRestrictionService } from './services/ip-restriction.service';
import { AttendanceCorrectionsService } from './services/attendance-corrections.service';
import { AttendanceReportsService } from './services/attendance-reports.service';
import { AttendanceExportService } from './services/attendance-export.service';
import { AttendanceReconciliationService } from './services/attendance-reconciliation.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    AttendancePoliciesController,
    AttendanceController,
    AllowedIpRulesController,
    AttendanceCorrectionsController,
    AttendanceReportsController,
    AttendanceExportController,
  ],
  providers: [
    AttendancePoliciesService,
    AttendanceService,
    IpRestrictionService,
    AttendanceCorrectionsService,
    AttendanceReportsService,
    AttendanceExportService,
    AttendanceReconciliationService,
  ],
  exports: [AttendanceService, AttendanceReconciliationService],
})
export class AttendanceModule {}
