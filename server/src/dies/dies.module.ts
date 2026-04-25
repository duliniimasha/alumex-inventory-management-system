import { Module } from '@nestjs/common';
import { DiesController } from './dies.controller';
import { DiesService } from './dies.service';

@Module({
  controllers: [DiesController],
  providers: [DiesService],
})
export class DiesModule {}
