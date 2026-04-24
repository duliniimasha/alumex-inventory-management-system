import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import {
  authorize,
  authorizeOwn,
  AuthenticateMiddleware,
  enforceExportInventoryWrite,
  enforceExportOrderScope,
  enforceProductionRawMaterialQtyEdit,
} from './auth/auth.middleware';
import { loginValidators, registerValidators } from './auth/auth.validators';
import { validateRequest } from './auth/validation.middleware';
import { AuditLogMiddleware } from './audit/audit-log.middleware';
import { CustomersModule } from './customers/customers.module';
import { DiesModule } from './dies/dies.module';
import { EventsModule } from './events/events.module';
import { InventoryModule } from './inventory/inventory.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProductionJobsModule } from './production-jobs/production-jobs.module';
import { ProductsModule } from './products/products.module';
import { RawMaterialsModule } from './raw-materials/raw-materials.module';
import { ReportsModule } from './reports/reports.module';
import { SalesOrdersModule } from './sales-orders/sales-orders.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { StocktakeModule } from './stocktake/stocktake.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { ReturnsModule } from './returns/returns.module';
import { ShippingDocsModule } from './shipping-docs/shipping-docs.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
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
    PurchaseOrdersModule,
    ReturnsModule,
    ShippingDocsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  constructor(private readonly prisma: PrismaService) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(validateRequest(registerValidators))
      .forRoutes({ path: 'auth/register', method: RequestMethod.POST });

    consumer
      .apply(validateRequest(loginValidators))
      .forRoutes({ path: 'auth/login', method: RequestMethod.POST });

    consumer
      .apply(AuthenticateMiddleware, AuditLogMiddleware)
      .exclude({ path: 'auth/login', method: RequestMethod.POST })
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    consumer
      .apply(authorize(Role.SYSTEM_ADMIN))
      .forRoutes({ path: 'auth/register', method: RequestMethod.POST });

    consumer
      .apply(authorize(Role.PROCUREMENT_OFFICER))
      .forRoutes(
        { path: 'suppliers', method: RequestMethod.ALL },
        { path: 'suppliers/:id', method: RequestMethod.ALL },
        { path: 'raw-materials', method: RequestMethod.POST },
        { path: 'raw-materials/:id', method: RequestMethod.DELETE },
        { path: 'dies', method: RequestMethod.ALL },
        { path: 'dies/:id', method: RequestMethod.ALL },
        { path: 'purchase-orders', method: RequestMethod.ALL },
        { path: 'purchase-orders/:id', method: RequestMethod.ALL },
      );

    consumer
      .apply(authorize(Role.PROCUREMENT_OFFICER, Role.PRODUCTION_SUPERVISOR))
      .forRoutes(
        { path: 'raw-materials', method: RequestMethod.GET },
        { path: 'raw-materials/:id', method: RequestMethod.GET },
      );

    consumer
      .apply(
        authorize(Role.PROCUREMENT_OFFICER, Role.PRODUCTION_SUPERVISOR),
        enforceProductionRawMaterialQtyEdit,
      )
      .forRoutes({ path: 'raw-materials/:id', method: RequestMethod.PUT });

    consumer
      .apply(
        authorize(
          Role.PROCUREMENT_OFFICER,
          Role.PRODUCTION_SUPERVISOR,
          Role.QC_INSPECTOR,
        ),
      )
      .forRoutes(
        { path: 'production-jobs', method: RequestMethod.GET },
        { path: 'production-jobs/:id', method: RequestMethod.GET },
        { path: 'production-jobs/:jobId/inspections', method: RequestMethod.GET },
      );

    consumer
      .apply(authorize(Role.PRODUCTION_SUPERVISOR))
      .forRoutes(
        { path: 'production-jobs', method: RequestMethod.POST },
        { path: 'production-jobs/:id', method: RequestMethod.PUT },
        { path: 'production-jobs/:id', method: RequestMethod.DELETE },
      );

    consumer
      .apply(authorize(Role.QC_INSPECTOR))
      .forRoutes(
        { path: 'production-jobs/:jobId/inspections', method: RequestMethod.POST },
        { path: 'inspections/:id', method: RequestMethod.PUT },
      );

    consumer
      .apply(
        authorize(
          Role.PRODUCTION_SUPERVISOR,
          Role.QC_INSPECTOR,
          Role.WAREHOUSE_OFFICER,
          Role.SALES_EXECUTIVE,
          Role.EXPORT_COORDINATOR,
        ),
      )
      .forRoutes(
        { path: 'inventory', method: RequestMethod.GET },
        { path: 'inventory/:id', method: RequestMethod.GET },
      );

    consumer
      .apply(
        authorize(Role.WAREHOUSE_OFFICER, Role.EXPORT_COORDINATOR),
        enforceExportInventoryWrite,
      )
      .forRoutes(
        { path: 'inventory/receive', method: RequestMethod.POST },
        { path: 'inventory/:id/transfer', method: RequestMethod.PUT },
      );

    consumer
      .apply(authorize(Role.WAREHOUSE_OFFICER, Role.EXPORT_COORDINATOR))
      .forRoutes({ path: 'stock-movements', method: RequestMethod.POST });

    consumer
      .apply(authorize(Role.WAREHOUSE_OFFICER))
      .forRoutes({ path: 'stocktake/submit', method: RequestMethod.POST });

    consumer
      .apply(authorize(Role.SALES_EXECUTIVE, Role.EXPORT_COORDINATOR, Role.WAREHOUSE_OFFICER))
      .forRoutes(
        { path: 'orders', method: RequestMethod.GET },
        { path: 'orders/:id', method: RequestMethod.GET },
      );

    consumer
      .apply(
        authorize(Role.SALES_EXECUTIVE, Role.EXPORT_COORDINATOR),
        enforceExportOrderScope(this.prisma),
        authorizeOwn(this.prisma, {
          resource: 'order',
          applyOwnerFilterOnList: true,
        }),
      )
      .forRoutes({ path: 'orders', method: RequestMethod.POST });

    consumer
      .apply(
        authorize(Role.SALES_EXECUTIVE, Role.EXPORT_COORDINATOR, Role.WAREHOUSE_OFFICER),
        enforceExportOrderScope(this.prisma),
        authorizeOwn(this.prisma, {
          resource: 'order',
          applyOwnerFilterOnList: true,
        }),
      )
      .forRoutes({ path: 'orders', method: RequestMethod.GET });

    consumer
      .apply(
        authorize(Role.SALES_EXECUTIVE, Role.EXPORT_COORDINATOR, Role.WAREHOUSE_OFFICER),
        enforceExportOrderScope(this.prisma),
        authorizeOwn(this.prisma, { resource: 'order' }),
      )
      .forRoutes({ path: 'orders/:id', method: RequestMethod.GET });

    consumer
      .apply(authorize(Role.WAREHOUSE_OFFICER))
      .forRoutes({ path: 'orders/:id/dispatch', method: RequestMethod.PUT });

    consumer
      .apply(
        authorize(Role.SALES_EXECUTIVE),
        authorizeOwn(this.prisma, { resource: 'order' }),
      )
      .forRoutes(
        { path: 'orders/:id/cancel', method: RequestMethod.PUT },
        { path: 'orders/:id/return', method: RequestMethod.POST },
      );

    consumer
      .apply(
        authorize(Role.SALES_EXECUTIVE),
        authorizeOwn(this.prisma, { resource: 'order', idParam: 'orderId' }),
      )
      .forRoutes({ path: 'orders/:orderId/lines', method: RequestMethod.POST });

    consumer
      .apply(
        authorize(Role.SALES_EXECUTIVE),
        authorizeOwn(this.prisma, { resource: 'order-line' }),
      )
      .forRoutes(
        { path: 'orders/lines/:id', method: RequestMethod.PUT },
        { path: 'orders/lines/:id', method: RequestMethod.DELETE },
      );

    consumer
      .apply(
        authorize(Role.SALES_EXECUTIVE),
        authorizeOwn(this.prisma, {
          resource: 'customer',
          applyOwnerFilterOnList: true,
        }),
      )
      .forRoutes(
        { path: 'customers', method: RequestMethod.GET },
        { path: 'customers/:id', method: RequestMethod.GET },
        { path: 'customers', method: RequestMethod.POST },
        { path: 'customers/:id', method: RequestMethod.PUT },
      );

    consumer
      .apply(
        authorize(
          Role.PROCUREMENT_OFFICER,
          Role.PRODUCTION_SUPERVISOR,
          Role.QC_INSPECTOR,
          Role.WAREHOUSE_OFFICER,
          Role.SALES_EXECUTIVE,
          Role.EXPORT_COORDINATOR,
        ),
      )
      .forRoutes(
        { path: 'products', method: RequestMethod.GET },
        { path: 'products/:id', method: RequestMethod.GET },
        { path: 'reports/:route', method: RequestMethod.GET },
        { path: 'reports/:route/:orderId', method: RequestMethod.GET },
      );

    consumer
      .apply(authorize(Role.SYSTEM_ADMIN))
      .forRoutes(
        { path: 'products', method: RequestMethod.POST },
        { path: 'products/:id', method: RequestMethod.PUT },
      );

    consumer
      .apply(authorize(Role.EXPORT_COORDINATOR))
      .forRoutes(
        { path: 'shipping-docs', method: RequestMethod.ALL },
        { path: 'shipping-docs/:id', method: RequestMethod.ALL },
      );

    consumer
      .apply(
        authorize(Role.SALES_EXECUTIVE),
        authorizeOwn(this.prisma, {
          resource: 'order',
          idParam: 'orderId',
        }),
      )
      .forRoutes(
        { path: 'returns/:orderId', method: RequestMethod.GET },
        { path: 'returns/:orderId', method: RequestMethod.POST },
      );
  }
}
