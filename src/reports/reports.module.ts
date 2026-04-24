import { Module } from '@nestjs/common';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [StockMovementsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
