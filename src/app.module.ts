import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DiesModule } from './dies/dies.module';
import { EventsModule } from './events/events.module';
import { PrismaModule } from './prisma/prisma.module';
import { RawMaterialsModule } from './raw-materials/raw-materials.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    SuppliersModule,
    RawMaterialsModule,
    DiesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
