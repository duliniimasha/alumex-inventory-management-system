import { Module } from '@nestjs/common';
import { InspectionsController } from './inspections.controller';
import { ProductionJobsController } from './production-jobs.controller';
import { ProductionJobsService } from './production-jobs.service';

@Module({
  controllers: [ProductionJobsController, InspectionsController],
  providers: [ProductionJobsService],
})
export class ProductionJobsModule {}
