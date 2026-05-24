import clsx from 'clsx';
import { Download } from 'lucide-react';
import { useMemo } from 'react';
import type { AgingStockItem } from '../../types/reports.types';
import { formatDate, formatNumber } from '../../utils/formatters';
import { formatLocationCode, getZoneBadgeColor, getZoneLabel } from '../../utils/inventory.utils';
import Badge from '../ui/Badge';
import DataTable, { type Column } from '../ui/DataTable';

interface AgingStockPanelProps {
  data: AgingStockItem[] | null;
  isLoading: boolean;
  daysThreshold: number;
  onDaysChange: (days: number) => void;
  onExport?: () => void;
}

const DAY_OPTIONS = [30, 60, 90, 180, 365];

export default function AgingStockPanel({
  data,
  isLoading,
  daysThreshold,
  onDaysChange,
  onExport,
}: AgingStockPanelProps) {
  const sortedData = useMemo(() => {
    if (!data) {
      return [];
    }

    return [...data].sort((left, right) => right.days_since_movement - left.days_since_movement);
  }, [data]);

  const totalQuantity = useMemo(() => {
    if (!data) {
      return 0;
    }

    return data.reduce((sum, item) => sum + item.quantity, 0);
  }, [data]);

  const columns: Column<AgingStockItem>[] = [
    {
      key: 'product_sku',
      header: 'SKU',
      sortable: true,
      render: (row) => <span className="font-medium text-gray-800">{row.product_sku}</span>,
    },
    {
      key: 'product_name',
      header: 'Product Name',
      render: (row) => row.product_name,
    },
    {
      key: 'warehouse_zone',
      header: 'Zone',
      render: (row) => (
        <Badge
          label={getZoneLabel(row.warehouse_zone)}
          color={getZoneBadgeColor(row.warehouse_zone)}
        />
      ),
    },
    {
      key: 'location_code',
      header: 'Location',
      render: (row) => formatLocationCode(row.location_code),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      sortable: true,
      render: (row) => `${formatNumber(row.quantity)} ${row.unit}`,
    },
    {
      key: 'days_since_movement',
      header: 'Days Since Move',
      sortable: true,
      render: (row) => {
        const tone =
          row.days_since_movement > 180
            ? 'text-red-600'
            : row.days_since_movement > 90
              ? 'text-amber-600'
              : 'text-gray-600';

        return <span className={`font-semibold ${tone}`}>{row.days_since_movement}</span>;
      },
    },
    {
      key: 'received_at',
      header: 'Received Date',
      render: (row) => formatDate(row.received_at),
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-base font-semibold text-gray-900">Items not moved in</h3>
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            {DAY_OPTIONS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onDaysChange(days)}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  daysThreshold === days
                    ? 'bg-amber-500 text-white'
                    : 'text-gray-600 hover:text-gray-900',
                )}
              >
                {days}
              </button>
            ))}
          </div>
          <span className="text-xs font-semibold text-gray-500">days</span>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onExport}
          disabled={!onExport || isLoading || sortedData.length === 0}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
        <span className="font-semibold text-gray-900">{formatNumber(sortedData.length)}</span> items flagged,
        total qty: <span className="font-semibold text-gray-900">{formatNumber(totalQuantity)}</span>
      </div>

      <DataTable
        columns={columns}
        data={sortedData}
        isLoading={isLoading}
        emptyMessage="No aging stock items found."
      />
    </section>
  );
}
