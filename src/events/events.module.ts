import { Global, Module } from '@nestjs/common';
import { InventoryEventsService } from './inventory-events.service';

@Global()
@Module({
  providers: [InventoryEventsService],
  exports: [InventoryEventsService],
})
export class EventsModule {}
