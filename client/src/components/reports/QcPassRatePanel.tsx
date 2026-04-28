import { BarChart2, CheckCircle, PauseCircle, XCircle } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { QcPassRateReport } from '../../types/reports.types';
import { formatNumber } from '../../utils/formatters';
import { getProcessTypeLabel } from '../../utils/production.utils';
import MetricCard from '../charts/MetricCard';
import StatProgressBar from '../charts/StatProgressBar';
import { CHART_COLORS } from '../charts/chartColors';

interface QcPassRatePanelProps {
  data: QcPassRateReport | null;
  isLoading: boolean;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number | string; name?: string; color?: string }>;
  label?: string;
}

function StackedChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-black/5">
      <p className="text-gray-500">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color ?? CHART_COLORS.gray }}
              />
              <span className="text-gray-600">{entry.name}</span>
            </div>
            <span className="font-semibold text-gray-900">
              {(() => {
                const numericValue = typeof entry.value === 'number' ? entry.value : Number(entry.value);
                return formatNumber(Number.isFinite(numericValue) ? numericValue : 0);
              })()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QcPassRatePanel({ data, isLoading }: QcPassRatePanelProps) {
  const overallPassRate = data?.overall?.pass_rate ?? 0;
  const chartRows = (data?.by_process_type ?? []).map((item) => ({
    label: getProcessTypeLabel(item.process_type),
    pass: item.pass,
    hold: item.hold,
    reject: item.reject,
  }));

  const passRateColor = overallPassRate >= 90 ? 'green' : overallPassRate >= 70 ? 'amber' : 'red';

  return (
    <section className="space-y-6">
      <div className="mx-auto max-w-md">
        <MetricCard
          title="Overall Pass Rate"
          value={`${formatNumber(overallPassRate, 1)}%`}
          icon={CheckCircle}
          color={passRateColor}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Pass Count"
          value={formatNumber(data?.overall.pass ?? 0)}
          icon={CheckCircle}
          color="green"
          size="sm"
          isLoading={isLoading}
        />
        <MetricCard
          title="Hold Count"
          value={formatNumber(data?.overall.hold ?? 0)}
          icon={PauseCircle}
          color="amber"
          size="sm"
          isLoading={isLoading}
        />
        <MetricCard
          title="Reject Count"
          value={formatNumber(data?.overall.reject ?? 0)}
          icon={XCircle}
          color="red"
          size="sm"
          isLoading={isLoading}
        />
      </div>

      <div className="space-y-3">
        {(data?.by_process_type ?? []).map((item) => {
          const tone = item.pass_rate >= 90 ? 'green' : item.pass_rate >= 70 ? 'amber' : 'red';

          return (
            <StatProgressBar
              key={item.process_type}
              label={getProcessTypeLabel(item.process_type)}
              value={item.pass}
              maxValue={item.total}
              color={tone}
              formatter={formatNumber}
            />
          );
        })}
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <header className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">QC Results by Process Type</h3>
        </header>

        {isLoading ? (
          <div className="w-full animate-pulse rounded-lg bg-gray-100" style={{ height: 280 }} />
        ) : chartRows.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center gap-2 text-gray-400" style={{ height: 280 }}>
            <BarChart2 className="h-8 w-8" />
            <p className="text-sm font-medium">No data available</p>
          </div>
        ) : (
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip content={<StackedChartTooltip />} />
                <Legend verticalAlign="bottom" height={36} />
                <Bar dataKey="pass" name="Pass" stackId="qc" fill={CHART_COLORS.green} />
                <Bar dataKey="hold" name="Hold" stackId="qc" fill={CHART_COLORS.amber} />
                <Bar dataKey="reject" name="Reject" stackId="qc" fill={CHART_COLORS.red} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </section>
  );
}
