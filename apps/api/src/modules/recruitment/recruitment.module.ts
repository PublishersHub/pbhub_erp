import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OnboardingModule } from '../onboarding/onboarding.module';

import { JobRequisitionsController } from './controllers/job-requisitions.controller';
import { JobPostingsController } from './controllers/job-postings.controller';
import { CandidatesController } from './controllers/candidates.controller';
import { JobApplicationsController } from './controllers/job-applications.controller';
import { InterviewsController } from './controllers/interviews.controller';
import { OffersController } from './controllers/offers.controller';

import { JobRequisitionsService } from './services/job-requisitions.service';
import { JobPostingsService } from './services/job-postings.service';
import { ApplicationStagesService } from './services/application-stages.service';
import { CandidatesService } from './services/candidates.service';
import { JobApplicationsService } from './services/job-applications.service';
import { InterviewsService } from './services/interviews.service';
import { OffersService } from './services/offers.service';
import { HireService } from './services/hire.service';

@Module({
  imports: [PrismaModule, OnboardingModule],
  controllers: [
    JobRequisitionsController,
    JobPostingsController,
    CandidatesController,
    JobApplicationsController,
    InterviewsController,
    OffersController,
  ],
  providers: [
    JobRequisitionsService,
    JobPostingsService,
    ApplicationStagesService,
    CandidatesService,
    JobApplicationsService,
    InterviewsService,
    OffersService,
    HireService,
  ],
  exports: [HireService],
})
export class RecruitmentModule {}
