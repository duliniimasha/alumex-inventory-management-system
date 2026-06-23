import {
  Banknote,
  Boxes,
  ClipboardList,
  Layers,
  Package,
  Percent,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import BarChartWidget from '../charts/BarChartWidget';
import DonutChartWidget from '../charts/DonutChartWidget';
import LineChartWidget from '../charts/LineChartWidget';
import MetricCard from '../charts/MetricCard';
import { CHART_COLORS } from '../charts/chartColors';
import { formatNumber } from '../../utils/formatters';
import type { NameValue, ReportChartData } from '../../types/reports.types';

const PALETTE = [
  CHART_COLORS.amber,
  CHART_COLORS.blue,
  CHART_COLORS.green,
  CHART_COLORS.purple,
  CHART_COLORS.teal,
  CHART_COLORS.orange,
  CHART_COLORS.red,
  CHART_COLORS.gray,
];

const money = (value: number) => `LKR ${formatNumber(value, 2)}`;
const count = (value: number) => formatNumber(value, 0);
const kg = (value: number) => `${formatNumber(value, 2)} kg`;

function toDonut(items: NameValue[]) {
  return items.map((item, index) => ({
    ...item,
    color: PALETTE[index % PALETTE.length],
  }));
}

function ChartGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-6 lg:grid-cols-2">{children}</div>;
}

function MetricsRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export default function ReportChartsPanel({
  data,
  isLoading,
}: {
  data: ReportChartData | null;
  isLoading: boolean;
}) {
  if (!data) {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-72 animate-pulse rounded-xl bg-gray-100" />
          </div>
        </div>
      );
    }
    return null;
  }

  if (data.kind === 'customers') {
    return (
      <div className="space-y-6">
        <MetricsRow>
          <MetricCard title="Customers" value={count(data.totals.customers)} icon={Users} color="blue" isLoading={isLoading} />
          <MetricCard title="Orders" value={count(data.totals.orders)} icon={ShoppingCart} color="amber" isLoading={isLoading} />
          <MetricCard title="Ordered Value" value={money(data.totals.ordered_value)} icon={Wallet} color="green" isLoading={isLoading} />
          <MetricCard title="Outstanding Value" value={money(data.totals.outstanding_value)} icon={ClipboardList} color="red" isLoading={isLoading} />
        </MetricsRow>
        <ChartGrid>
          <BarChartWidget
            title="Top customers by ordered value"
            data={data.top_customers}
            valueFormatter={money}
            isLoading={isLoading}
            color={CHART_COLORS.blue}
          />
          <DonutChartWidget
            title="Ordered value by customer type"
            data={toDonut(data.value_by_type)}
            valueFormatter={money}
            isLoading={isLoading}
          />
        </ChartGrid>
      </div>
    );
  }

  if (data.kind === 'suppliers') {
    return (
      <div className="space-y-6">
        <MetricsRow>
          <MetricCard title="Suppliers" value={count(data.totals.suppliers)} icon={Truck} color="blue" isLoading={isLoading} />
          <MetricCard title="Materials" value={count(data.totals.materials)} icon={Package} color="amber" isLoading={isLoading} />
          <MetricCard title="Total Quantity" value={kg(data.totals.total_qty)} icon={Boxes} color="green" isLoading={isLoading} />
          <MetricCard title="Below Reorder" value={count(data.totals.below_reorder)} icon={ClipboardList} color="red" isLoading={isLoading} />
        </MetricsRow>
        <ChartGrid>
          <BarChartWidget
            title="Top suppliers by quantity (kg)"
            data={data.top_suppliers}
            valueFormatter={kg}
            isLoading={isLoading}
            color={CHART_COLORS.teal}
          />
          <DonutChartWidget
            title="Quantity by material category"
            data={toDonut(data.qty_by_category)}
            valueFormatter={kg}
            isLoading={isLoading}
          />
        </ChartGrid>
      </div>
    );
  }

  if (data.kind === 'tax') {
    return (
      <div className="space-y-6">
        <MetricsRow>
          <MetricCard title="Taxable Net" value={money(data.totals.net)} icon={Wallet} color="blue" isLoading={isLoading} />
          <MetricCard title="Output VAT" value={money(data.totals.vat)} icon={Receipt} color="amber" isLoading={isLoading} />
          <MetricCard title="Gross (incl. VAT)" value={money(data.totals.gross)} icon={Banknote} color="green" isLoading={isLoading} />
          <MetricCard title="VAT Rate" value={`${formatNumber(data.rate * 100, 2)}%`} icon={Percent} color="purple" isLoading={isLoading} />
        </MetricsRow>
        <ChartGrid>
          <BarChartWidget
            title="Output VAT by month"
            data={data.vat_by_month}
            valueFormatter={money}
            isLoading={isLoading}
            color={CHART_COLORS.amber}
          />
          <DonutChartWidget
            title="Output VAT by channel"
            data={toDonut(data.vat_by_channel)}
            valueFormatter={money}
            isLoading={isLoading}
          />
        </ChartGrid>
      </div>
    );
  }

  // sales | income
  const valueLabel = data.kind === 'sales' ? 'Net Sales' : 'Net Income';
  const qtyLabel = data.kind === 'sales' ? 'Qty Ordered' : 'Units Dispatched';

  return (
    <div className="space-y-6">
      <MetricsRow>
        <MetricCard title="Orders" value={count(data.order_count)} icon={ShoppingCart} color="blue" isLoading={isLoading} />
        <MetricCard title={qtyLabel} value={count(data.total_qty)} icon={Layers} color="purple" isLoading={isLoading} />
        <MetricCard title={valueLabel} value={money(data.totals.net)} icon={Wallet} color="green" isLoading={isLoading} />
        <MetricCard title="Gross (incl. VAT)" value={money(data.totals.gross)} icon={Banknote} color="amber" isLoading={isLoading} />
      </MetricsRow>
      <ChartGrid>
        <DonutChartWidget
          title={`${valueLabel} by channel`}
          data={toDonut(data.by_channel)}
          valueFormatter={money}
          isLoading={isLoading}
        />
        <BarChartWidget
          title="Top products by value"
          data={data.top_products}
          valueFormatter={money}
          isLoading={isLoading}
          color={CHART_COLORS.green}
        />
      </ChartGrid>
      <LineChartWidget
        title={data.kind === 'sales' ? 'Sales over time' : 'Income over time'}
        data={data.by_month}
        lines={[
          { key: 'net', label: 'Net', color: CHART_COLORS.blue },
          { key: 'gross', label: 'Gross', color: CHART_COLORS.amber },
        ]}
        valueFormatter={money}
        isLoading={isLoading}
      />
    </div>
  );
}
