import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export interface ReorderAlertPayload {
  rawMaterialId: string;
  materialType: string;
  quantityKg: number;
  reorderLevel: number;
}

export interface DieRetiredPayload {
  dieId: string;
  profileCode: string;
  usageCount: number;
  maxUsage: number;
}

@Injectable()
export class InventoryEventsService extends EventEmitter {
  private readonly logger = new Logger(InventoryEventsService.name);

  emitReorderAlert(payload: ReorderAlertPayload): void {
    this.logger.warn(
      `reorder_alert emitted for material ${payload.rawMaterialId}`,
    );
    this.emit('reorder_alert', payload);
  }

  emitDieRetired(payload: DieRetiredPayload): void {
    this.logger.warn(`die_retired emitted for die ${payload.dieId}`);
    this.emit('die_retired', payload);
  }
}
