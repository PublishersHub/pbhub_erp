import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { RolesModule } from './modules/roles/roles.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeaveModule } from './modules/leave/leave.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { NotificationModule } from './modules/notification/notification.module';
import { JwtAccessGuard } from './modules/auth/guards/jwt-access.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import appConfig from './config/app.config';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),

    // Rate limiting (general baseline)
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),

    // Event bus (in-process, used by notification dispatcher)
    EventEmitterModule.forRoot(),

    // Infrastructure
    PrismaModule,
    RedisModule,

    // Feature modules
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    RolesModule,
    EmployeesModule,
    AttendanceModule,
    LeaveModule,
    PerformanceModule,
    PayrollModule,
    ExpenseModule,
    OnboardingModule,
    RecruitmentModule,
    NotificationModule,
  ],
  providers: [
    // Global guards applied in order:
    // 1. JWT auth (all routes require auth unless @Public())
    { provide: APP_GUARD, useClass: JwtAccessGuard },
    // 2. Permission check (only if @RequirePermissions() is present)
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
