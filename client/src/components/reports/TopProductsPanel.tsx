import type { TopProductsReport } from '../../types/reports.types';
import { formatNumber } from '../../utils/formatters';
import { getCategoryBadgeColor, getCategoryLabel } from '../../utils/inventory.utils';
import BarChartWidget from '../charts/BarChartWidget';
import { CHART_COLORS } from '../charts/chartColors';
import Badge from '../ui/Badge';
import DataTable, { type Column } from '../ui/DataTable';

interface TopProductsPanelProps {
  data: TopProductsReport | null;
  isLoading: boolean;
}

type ProductRow = TopProductsReport['products'][number];

const medalByRank: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export default function TopProductsPanel({ data, isLoading }: TopProductsPanelProps) {
  const products = data?.products ?? [];
  const topTen = products.slice(0, 10);

  const chartData = topTen.map((product) => ({
    label: product.sku,
    value: product.total_dispatched_qty,
  }));

  const columns: Column<ProductRow>[] = [
    {
      key: 'rank',
      header: 'Rank',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-gray-800">
          {medalByRank[row.rank] ?? formatNumber(row.rank)}
        </span>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (row) => <span className="font-medium text-gray-800">{row.sku}</span>,
    },
    {
      key: 'name',
      header: 'Product Name',
      render: (row) => row.name,
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <Badge label={getCategoryLabel(row.category)} color={getCategoryBadgeColor(row.category)} />
      ),
    },
    {
      key: 'total_dispatched_qty',
      header: 'Dispatched Qty',
      sortable: true,
      render: (row) => formatNumber(row.total_dispatched_qty),
    },
    {
      key: 'unit',
      header: 'Unit',
      render: (row) => row.unit,
    },
    {
      key: 'order_count',
      header: 'Orders',
      sortable: true,
      render: (row) => formatNumber(row.order_count),
    },
  ];

  return (
    <section className="space-y-6">
      <BarChartWidget
        data={chartData}
        title="Top 10 Products by Dispatch Volume"
        isLoading={isLoading}
        color={CHART_COLORS.amber}
      />

      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        emptyMessage="No top products data available."
      />
    </section>
  );
}
