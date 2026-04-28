import { BarChart2 } from 'lucide-react';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';

interface DonutChartDatum {
  label: string;
  value: number;
  color: string;
}

interface DonutChartWidgetProps {
  data: DonutChartDatum[];
  title: string;
  centerLabel?: string;
  centerValue?: string | number;
  valueFormatter?: (val: number) => string;
  isLoading?: boolean;
  size?: number;
}

const defaultValueFormatter = (value: number) => new Intl.NumberFormat('en-US').format(value);

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  valueFormatter: (val: number) => string;
}

function ChartTooltip({ active, payload, valueFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const entry = payload[0];
  const rawValue = entry.value;
  const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);

  return (
    <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-black/5">
      <p className="text-gray-500">{entry.name}</p>
      <p className="mt-1 text-base font-semibold text-gray-900">
        {valueFormatter(Number.isFinite(numericValue) ? numericValue : 0)}
      </p>
    </div>
  );
}

export default function DonutChartWidget({
  data,
  title,
  centerLabel,
  centerValue,
  valueFormatter = defaultValueFormatter,
  isLoading = false,
  size = 240,
}: DonutChartWidgetProps) {
  const outerRadius = Math.round(size * 0.42);
  const innerRadius = Math.round(size * 0.28);
  const hasCenterContent = centerLabel || centerValue !== undefined;
  const formattedCenterValue =
    typeof centerValue === 'number' ? valueFormatter(centerValue) : centerValue;

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      </header>

      {isLoading ? (
        <div className="w-full animate-pulse rounded-lg bg-gray-100" style={{ height: size }} />
      ) : data.length === 0 ? (
        <div className="flex w-full flex-col items-center justify-center gap-2 text-gray-400" style={{ height: size }}>
          <BarChart2 className="h-8 w-8" />
          <p className="text-sm font-medium">No data available</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative" style={{ width: size, height: size }}>
            <PieChart width={size} height={size}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell key={entry.label} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
            </PieChart>
            {hasCenterContent ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {centerLabel ? <p className="text-xs font-medium text-gray-500">{centerLabel}</p> : null}
                {formattedCenterValue !== undefined ? (
                  <p className="mt-1 text-lg font-semibold text-gray-900">{formattedCenterValue}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col gap-3">
            {data.map((entry) => (
              <div key={entry.label} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-600">{entry.label}</span>
                </div>
                <span className="font-semibold text-gray-900">{valueFormatter(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
