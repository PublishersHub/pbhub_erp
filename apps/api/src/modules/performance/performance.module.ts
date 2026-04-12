import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PerformanceCyclesController } from './controllers/performance-cycles.controller';
import { GoalsController } from './controllers/goals.controller';
import { PerformanceReviewsController } from './controllers/performance-reviews.controller';
import { PerformanceCyclesService } from './services/performance-cycles.service';
import { GoalsService } from './services/goals.service';
import { PerformanceReviewsService } from './services/performance-reviews.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    PerformanceCyclesController,
    GoalsController,
    PerformanceReviewsController,
  ],
  providers: [
    PerformanceCyclesService,
    GoalsService,
    PerformanceReviewsService,
  ],
  exports: [PerformanceReviewsService],
})
export class PerformanceModule {}
