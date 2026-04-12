import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

import { OnboardingTemplatesController } from './controllers/onboarding-templates.controller';
import { OnboardingInstancesController } from './controllers/onboarding-instances.controller';
import { OnboardingTasksController } from './controllers/onboarding-tasks.controller';

import { OnboardingTemplatesService } from './services/onboarding-templates.service';
import { OnboardingInstancesService } from './services/onboarding-instances.service';
import { OnboardingTasksService } from './services/onboarding-tasks.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    OnboardingTemplatesController,
    OnboardingInstancesController,
    OnboardingTasksController,
  ],
  providers: [
    OnboardingTemplatesService,
    OnboardingInstancesService,
    OnboardingTasksService,
  ],
  exports: [OnboardingInstancesService],
})
export class OnboardingModule {}
