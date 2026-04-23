import { Module } from '@nestjs/common';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { StocktakeController } from './stocktake.controller';
import { StocktakeService } from './stocktake.service';

@Module({
  imports: [StockMovementsModule],
  controllers: [StocktakeController],
  providers: [StocktakeService],
})
export class StocktakeModule {}
