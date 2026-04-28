import clsx from 'clsx';
import type { OrderStatus } from '../../types/sales.types';

interface OrderStatusBarProps {
  activeStatus: OrderStatus | '';
  statusCounts: Record<OrderStatus, number>;
  onStatusChange: (status: OrderStatus | '') => void;
}

const chips: Array<{ key: OrderStatus | ''; label: string }> = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'picking', label: 'Picking' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'returned', label: 'Returned' },
];

export default function OrderStatusBar({
  activeStatus,
  statusCounts,
  onStatusChange,
}: OrderStatusBarProps) {
  const totalCount = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  const getCount = (key: OrderStatus | '') => {
    if (key === '') {
      return totalCount;
    }

    return statusCounts[key] ?? 0;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => {
        const isActive = activeStatus === chip.key;

        return (
          <button
            key={chip.key || 'all'}
            type="button"
            onClick={() => onStatusChange(chip.key)}
            className={clsx(
              'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition',
              isActive
                ? 'bg-amber-100 text-amber-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            <span>{chip.label}</span>
            <span className="text-xs font-semibold">{getCount(chip.key)}</span>
          </button>
        );
      })}
    </div>
  );
}
