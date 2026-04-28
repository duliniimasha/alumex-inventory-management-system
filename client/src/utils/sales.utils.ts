import type { CustomerType, OrderChannel, OrderStatus } from '../types/sales.types';
import { formatNumber } from './formatters';

type BadgeColor = 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'purple';

const countryEmojiMap: Record<string, string> = {
  'sri lanka': '🇱🇰',
  india: '🇮🇳',
  germany: '🇩🇪',
  china: '🇨🇳',
  usa: '🇺🇸',
  'united states': '🇺🇸',
  australia: '🇦🇺',
  uae: '🇦🇪',
  'united arab emirates': '🇦🇪',
  malaysia: '🇲🇾',
  singapore: '🇸🇬',
  japan: '🇯🇵',
  uk: '🇬🇧',
  'united kingdom': '🇬🇧',
};

export function getCustomerTypeBadgeColor(type: CustomerType): BadgeColor {
  switch (type) {
    case 'b2b':
      return 'blue';
    case 'fabricator':
      return 'amber';
    case 'retail':
      return 'green';
    case 'export':
      return 'purple';
    case 'government':
      return 'gray';
  }
}

export function getOrderStatusBadgeColor(status: OrderStatus): BadgeColor {
  switch (status) {
    case 'pending':
      return 'gray';
    case 'confirmed':
      return 'blue';
    case 'picking':
      return 'amber';
    case 'dispatched':
      return 'green';
    case 'delivered':
      return 'purple';
    case 'cancelled':
      return 'red';
    case 'returned':
      return 'amber';
  }
}

export function getChannelBadgeColor(channel: OrderChannel): BadgeColor {
  switch (channel) {
    case 'local':
      return 'gray';
    case 'alumex_store':
      return 'blue';
    case 'export':
      return 'purple';
  }
}

export function getCountryEmoji(country: string): string {
  if (!country) {
    return '🌐';
  }

  const normalized = country.trim().toLowerCase();
  return countryEmojiMap[normalized] ?? '🌐';
}

export function formatOrderId(id: string): string {
  return `#ORD-${id.slice(0, 8).toUpperCase()}`;
}

export function formatCurrency(amount: number, currency = 'LKR'): string {
  return `${currency} ${formatNumber(amount, 2)}`;
}
