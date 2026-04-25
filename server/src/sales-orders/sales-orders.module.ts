import { Module } from '@nestjs/common';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { OrderLinesController } from './order-lines.controller';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersService } from './sales-orders.service';

@Module({
  imports: [StockMovementsModule],
  controllers: [SalesOrdersController, OrderLinesController],
  providers: [SalesOrdersService],
})
export class SalesOrdersModule {}
