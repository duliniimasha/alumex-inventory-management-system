import { BarChart2 } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface LineSeries {
  key: string;
  label: string;
  color: string;
}

type LineChartDatum = {
  label: string;
  [key: string]: number | string;
};

interface LineChartWidgetProps {
  data: LineChartDatum[];
  lines: LineSeries[];
  title: string;
  subtitle?: string;
  valueFormatter?: (val: number) => string;
  isLoading?: boolean;
  height?: number;
}

const defaultValueFormatter = (value: number) => new Intl.NumberFormat('en-US').format(value);

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number | string; name?: string; color?: string }>;
  label?: string;
  valueFormatter: (val: number) => string;
}

function ChartTooltip({ active, payload, label, valueFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-black/5">
      <p className="text-gray-500">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => {
          const rawValue = entry.value;
          const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);

          return (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color ?? '#9CA3AF' }}
                />
                <span className="text-gray-600">{entry.name}</span>
              </div>
              <span className="font-semibold text-gray-900">
                {valueFormatter(Number.isFinite(numericValue) ? numericValue : 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LineChartWidget({
  data,
  lines,
  title,
  subtitle,
  valueFormatter = defaultValueFormatter,
  isLoading = false,
  height = 280,
}: LineChartWidgetProps) {
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
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis tickFormatter={valueFormatter} tick={{ fontSize: 12, fill: '#6B7280' }} />
              <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
              <Legend verticalAlign="bottom" height={36} />
              {lines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.label}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
