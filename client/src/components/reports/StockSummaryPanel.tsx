import { AlertTriangle, Boxes, Layers } from 'lucide-react';
import type { StockSummaryReport } from '../../types/reports.types';
import { formatNumber, formatWeight } from '../../utils/formatters';
import { getCategoryLabel } from '../../utils/inventory.utils';
import BarChartWidget from '../charts/BarChartWidget';
import MetricCard from '../charts/MetricCard';
import { CHART_COLORS } from '../charts/chartColors';
import Badge from '../ui/Badge';
import DataTable, { type Column } from '../ui/DataTable';

interface StockSummaryPanelProps {
  data: StockSummaryReport | null;
  isLoading: boolean;
}

type CategoryRow = {
  category: string;
  total_items: number;
  total_quantity: number;
  below_reorder_count: number;
};

const statusConfig = {
  adequate: { label: 'Adequate', color: 'green' },
  low: { label: 'Low Stock', color: 'red' },
} as const;

export default function StockSummaryPanel({ data, isLoading }: StockSummaryPanelProps) {
  const categories = data?.categories ?? [];
  const totalItems = data?.grand_total_items ?? 0;
  const totalQuantity = data?.grand_total_quantity ?? 0;
  const totalBelowReorder = data?.total_below_reorder ?? 0;

  const chartData = categories.map((category) => ({
    label: getCategoryLabel(category.category),
    value: category.total_quantity,
  }));

  const tableRows: CategoryRow[] = categories.map((category) => ({
    category: getCategoryLabel(category.category),
    total_items: category.total_items,
    total_quantity: category.total_quantity,
    below_reorder_count: category.below_reorder_count,
  }));

  const columns: Column<CategoryRow>[] = [
    {
      key: 'category',
      header: 'Category',
      render: (row) => <span className="font-medium text-gray-800">{row.category}</span>,
    },
    {
      key: 'total_items',
      header: 'Items',
      sortable: true,
      render: (row) => formatNumber(row.total_items),
    },
    {
      key: 'total_quantity',
      header: 'Total Qty',
      sortable: true,
      render: (row) => formatWeight(row.total_quantity),
    },
    {
      key: 'below_reorder_count',
      header: 'Below Reorder',
      sortable: true,
      render: (row) => formatNumber(row.below_reorder_count),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const status = row.below_reorder_count > 0 ? statusConfig.low : statusConfig.adequate;
        return <Badge label={status.label} color={status.color} />;
      },
    },
  ];

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Items"
          value={formatNumber(totalItems)}
          icon={Boxes}
          color="blue"
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Quantity"
          value={formatWeight(totalQuantity)}
          icon={Layers}
          color="amber"
          isLoading={isLoading}
        />
        <MetricCard
          title="Below Reorder Count"
          value={formatNumber(totalBelowReorder)}
          icon={AlertTriangle}
          color={totalBelowReorder > 0 ? 'red' : 'green'}
          isLoading={isLoading}
        />
      </div>

      <BarChartWidget
        data={chartData}
        title="Stock Quantity by Category"
        valueFormatter={formatWeight}
        isLoading={isLoading}
        color={CHART_COLORS.amber}
      />

      <DataTable columns={columns} data={tableRows} isLoading={isLoading} emptyMessage="No categories found." />
    </section>
  );
}
