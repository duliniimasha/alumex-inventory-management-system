import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomersModule } from './customers/customers.module';
import { DiesModule } from './dies/dies.module';
import { EventsModule } from './events/events.module';
import { InventoryModule } from './inventory/inventory.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductionJobsModule } from './production-jobs/production-jobs.module';
import { ProductsModule } from './products/products.module';
import { RawMaterialsModule } from './raw-materials/raw-materials.module';
import { ReportsModule } from './reports/reports.module';
import { SalesOrdersModule } from './sales-orders/sales-orders.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { StocktakeModule } from './stocktake/stocktake.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    SuppliersModule,
    RawMaterialsModule,
    DiesModule,
    ProductionJobsModule,
    ProductsModule,
    CustomersModule,
    SalesOrdersModule,
    ReportsModule,
    InventoryModule,
    StockMovementsModule,
    StocktakeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
