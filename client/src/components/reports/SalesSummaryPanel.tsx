import { BarChart3, DollarSign, PackageCheck, ShoppingBag } from 'lucide-react';
import type { SalesSummaryReport } from '../../types/reports.types';
import type { OrderChannel } from '../../types/sales.types';
import { formatNumber } from '../../utils/formatters';
import { formatCurrency } from '../../utils/sales.utils';
import DonutChartWidget from '../charts/DonutChartWidget';
import LineChartWidget from '../charts/LineChartWidget';
import MetricCard from '../charts/MetricCard';
import { CHART_COLORS } from '../charts/chartColors';
import DataTable, { type Column } from '../ui/DataTable';

interface SalesSummaryPanelProps {
  data: SalesSummaryReport | null;
  isLoading: boolean;
}

type ChannelRow = {
  channel: OrderChannel;
  order_count: number;
  total_value: number;
  units_dispatched: number;
};

const channelOrder: OrderChannel[] = ['local', 'alumex_store', 'export'];

const channelLabels: Record<OrderChannel, string> = {
  local: 'Local',
  alumex_store: 'Alumex Store',
  export: 'Export',
};

const channelColors: Record<OrderChannel, string> = {
  local: CHART_COLORS.gray,
  alumex_store: CHART_COLORS.blue,
  export: CHART_COLORS.purple,
};

export default function SalesSummaryPanel({ data, isLoading }: SalesSummaryPanelProps) {
  const totalOrders = data?.total_orders ?? 0;
  const totalValue = data?.total_value ?? 0;
  const totalUnits = data?.total_units_dispatched ?? 0;
  const avgOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;

  const trendData = data?.trend_data ?? [];
  const maxOrders = Math.max(0, ...trendData.map((point) => point.order_count));
  const maxValue = Math.max(0, ...trendData.map((point) => point.total_value));
  const scale = maxOrders > 0 ? maxValue / maxOrders : 1;
  const chartData = trendData.map((point) => ({
    label: point.period_label,
    order_count: point.order_count,
    total_value_scaled: scale > 0 ? point.total_value / scale : point.total_value,
  }));

  const donutData = channelOrder.map((channel) => ({
    label: channelLabels[channel],
    value: data?.by_channel?.[channel]?.order_count ?? 0,
    color: channelColors[channel],
  }));

  const channelRows: ChannelRow[] = channelOrder.map((channel) => ({
    channel,
    order_count: data?.by_channel?.[channel]?.order_count ?? 0,
    total_value: data?.by_channel?.[channel]?.total_value ?? 0,
    units_dispatched: data?.by_channel?.[channel]?.units_dispatched ?? 0,
  }));

  const columns: Column<ChannelRow>[] = [
    {
      key: 'channel',
      header: 'Channel',
      render: (row) => <span className="font-medium text-gray-800">{channelLabels[row.channel]}</span>,
    },
    {
      key: 'order_count',
      header: 'Orders',
      sortable: true,
      render: (row) => formatNumber(row.order_count),
    },
    {
      key: 'total_value',
      header: 'Value (LKR)',
      sortable: true,
      render: (row) => formatCurrency(row.total_value),
    },
    {
      key: 'units_dispatched',
      header: 'Units',
      sortable: true,
      render: (row) => formatNumber(row.units_dispatched),
    },
  ];

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard
          title="Total Orders"
          value={formatNumber(totalOrders)}
          icon={ShoppingBag}
          color="blue"
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Value (LKR)"
          value={formatCurrency(totalValue)}
          icon={DollarSign}
          color="green"
          isLoading={isLoading}
        />
        <MetricCard
          title="Units Dispatched"
          value={formatNumber(totalUnits)}
          icon={PackageCheck}
          color="purple"
          isLoading={isLoading}
        />
        <MetricCard
          title="Avg Order Value"
          value={formatCurrency(avgOrderValue)}
          icon={BarChart3}
          color="amber"
          isLoading={isLoading}
        />
      </div>

      <LineChartWidget
        data={chartData}
        lines={[
          { key: 'order_count', label: 'Orders', color: CHART_COLORS.blue },
          { key: 'total_value_scaled', label: 'Total Value (scaled)', color: CHART_COLORS.amber },
        ]}
        title="Sales Trend"
        subtitle={scale > 1 ? 'Total value scaled to align with order counts.' : undefined}
        valueFormatter={formatNumber}
        isLoading={isLoading}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DonutChartWidget data={donutData} title="Orders by Channel" isLoading={isLoading} />
        <DataTable
          columns={columns}
          data={channelRows}
          isLoading={isLoading}
          emptyMessage="No channel data available."
        />
      </div>
    </section>
  );
}
