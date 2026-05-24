import { BarChart2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { CHART_COLORS } from './chartColors';

type BarChartDatum = {
  label: string;
  value: number;
  color?: string;
};

interface BarChartWidgetProps {
  data: BarChartDatum[];
  title: string;
  subtitle?: string;
  valueFormatter?: (val: number) => string;
  isLoading?: boolean;
  height?: number;
  color?: string;
}

const defaultValueFormatter = (value: number) => new Intl.NumberFormat('en-US').format(value);

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string;
  valueFormatter: (val: number) => string;
}

function ChartTooltip({ active, payload, label, valueFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const rawValue = payload[0]?.value;
  const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);

  return (
    <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-black/5">
      <p className="text-gray-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-gray-900">
        {valueFormatter(Number.isFinite(numericValue) ? numericValue : 0)}
      </p>
    </div>
  );
}

export default function BarChartWidget({
  data,
  title,
  subtitle,
  valueFormatter = defaultValueFormatter,
  isLoading = false,
  height = 280,
  color = CHART_COLORS.amber,
}: BarChartWidgetProps) {
  const shouldRotateTicks = data.length > 6;

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
      </header>

      {isLoading ? (
        <div className="w-full animate-pulse rounded-lg bg-gray-100" style={{ height }} />
      ) : data.length === 0 ? (
        <div className="flex w-full flex-col items-center justify-center gap-2 text-gray-400" style={{ height }}>
          <BarChart2 className="h-8 w-8" />
          <p className="text-sm font-medium">No data available</p>
        </div>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 16, bottom: shouldRotateTicks ? 32 : 16, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                angle={shouldRotateTicks ? -30 : 0}
                textAnchor={shouldRotateTicks ? 'end' : 'middle'}
                tickMargin={shouldRotateTicks ? 12 : 8}
                height={shouldRotateTicks ? 60 : 30}
                interval={0}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <YAxis tickFormatter={valueFormatter} tick={{ fontSize: 12, fill: '#6B7280' }} />
              <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.label} fill={entry.color ?? color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
