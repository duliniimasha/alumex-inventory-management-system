import type { MovementType, ProductCategory, WarehouseZone } from '../types/inventory.types';

export function getCategoryBadgeColor(
  category: ProductCategory,
): 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'purple' {
  switch (category) {
    case 'architectural':
      return 'blue';
    case 'household':
      return 'green';
    case 'hardware':
      return 'amber';
    case 'industrial':
      return 'purple';
    case 'trading':
      return 'gray';
  }
}

export function getZoneBadgeColor(
  zone: WarehouseZone,
): 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'purple' {
  switch (zone) {
    case 'main':
      return 'blue';
    case 'export':
      return 'purple';
    case 'quarantine':
      return 'red';
    case 'dispatch':
      return 'green';
    case 'returns':
      return 'amber';
  }
}

export function getMovementSign(type: MovementType): '+' | '-' | '' {
  switch (type) {
    case 'receive':
    case 'return':
      return '+';
    case 'dispatch':
      return '-';
    case 'transfer':
    case 'adjustment':
    case 'stocktake_correction':
      return '';
  }
}

export function formatLocationCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isExportZone(zone: WarehouseZone): boolean {
  return zone === 'export';
}

export function getZoneLabel(zone: WarehouseZone): string {
  switch (zone) {
    case 'main':
      return 'Main Warehouse';
    case 'export':
      return 'Export Zone';
    case 'quarantine':
      return 'Quarantine';
    case 'dispatch':
      return 'Dispatch Bay';
    case 'returns':
      return 'Returns Area';
    default:
      return zone;
  }
}

export function getCategoryLabel(category: ProductCategory): string {
  switch (category) {
    case 'architectural':
      return 'Architectural';
    case 'household':
      return 'Household';
    case 'hardware':
      return 'Hardware';
    case 'industrial':
      return 'Industrial';
    case 'trading':
      return 'Trading Goods';
    default:
      return category;
  }
}
