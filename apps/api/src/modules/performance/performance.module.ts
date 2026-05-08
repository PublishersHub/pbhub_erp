import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PerformanceCyclesController } from './controllers/performance-cycles.controller';
import { GoalsController } from './controllers/goals.controller';
import { PerformanceReviewsController } from './controllers/performance-reviews.controller';
import { PerformanceNotesController } from './controllers/performance-notes.controller';
import { PerformanceCyclesService } from './services/performance-cycles.service';
import { GoalsService } from './services/goals.service';
import { PerformanceReviewsService } from './services/performance-reviews.service';
import { PerformanceNotesService } from './services/performance-notes.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    PerformanceCyclesController,
    GoalsController,
    PerformanceReviewsController,
    PerformanceNotesController,
  ],
  providers: [
    PerformanceCyclesService,
    GoalsService,
    PerformanceReviewsService,
    PerformanceNotesService,
  ],
  exports: [PerformanceReviewsService],
})
export class PerformanceModule {}
