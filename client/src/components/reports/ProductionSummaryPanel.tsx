import { Activity, CheckCircle, ClipboardList } from 'lucide-react';
import type { ProductionSummaryReport } from '../../types/reports.types';
import { formatNumber, formatWeight } from '../../utils/formatters';
import { getJobStatusLabel, getProcessTypeLabel } from '../../utils/production.utils';
import BarChartWidget from '../charts/BarChartWidget';
import DonutChartWidget from '../charts/DonutChartWidget';
import MetricCard from '../charts/MetricCard';
import { CHART_COLORS } from '../charts/chartColors';
import DataTable, { type Column } from '../ui/DataTable';

interface ProductionSummaryPanelProps {
  data: ProductionSummaryReport | null;
  isLoading: boolean;
}

type ProcessRow = ProductionSummaryReport['by_process_type'][number];

type StatusKey = keyof ProductionSummaryReport['by_status'];

const statusConfig: Array<{ key: StatusKey; color: string }> = [
  { key: 'pending', color: CHART_COLORS.gray },
  { key: 'in_progress', color: CHART_COLORS.blue },
  { key: 'completed', color: CHART_COLORS.green },
  { key: 'on_hold', color: CHART_COLORS.amber },
  { key: 'cancelled', color: CHART_COLORS.red },
];

export default function ProductionSummaryPanel({ data, isLoading }: ProductionSummaryPanelProps) {
  const byStatus = data?.by_status ?? {};
  const totalJobs = data?.total_jobs ?? 0;
  const completionRate = data?.completion_rate ?? 0;
  const activeJobs = (byStatus.pending ?? 0) + (byStatus.in_progress ?? 0);

  const statusChartData = statusConfig.map((status) => ({
    label: getJobStatusLabel(status.key),
    value: byStatus[status.key] ?? 0,
    color: status.color,
  }));

  const processChartData = (data?.by_process_type ?? []).map((item) => ({
    label: getProcessTypeLabel(item.process_type),
    value: item.job_count,
  }));

  const columns: Column<ProcessRow>[] = [
    {
      key: 'process_type',
      header: 'Process Type',
      render: (row) => <span className="font-medium text-gray-800">{getProcessTypeLabel(row.process_type)}</span>,
    },
    {
      key: 'job_count',
      header: 'Jobs',
      sortable: true,
      render: (row) => formatNumber(row.job_count),
    },
    {
      key: 'total_input_kg',
      header: 'Input (kg)',
      sortable: true,
      render: (row) => formatWeight(row.total_input_kg),
    },
    {
      key: 'total_output_kg',
      header: 'Output (kg)',
      sortable: true,
      render: (row) => formatWeight(row.total_output_kg),
    },
    {
      key: 'avg_yield_percent',
      header: 'Avg Yield %',
      sortable: true,
      render: (row) => {
        const tone =
          row.avg_yield_percent >= 85
            ? 'text-emerald-600'
            : row.avg_yield_percent >= 70
              ? 'text-amber-600'
              : 'text-red-600';

        return (
          <span className={`font-semibold ${tone}`}>
            {formatNumber(row.avg_yield_percent, 1)}%
          </span>
        );
      },
    },
  ];

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Jobs"
          value={formatNumber(totalJobs)}
          icon={ClipboardList}
          color="blue"
          isLoading={isLoading}
        />
        <MetricCard
          title="Completion Rate"
          value={`${formatNumber(completionRate, 1)}%`}
          icon={CheckCircle}
          color={completionRate >= 85 ? 'green' : completionRate >= 70 ? 'amber' : 'red'}
          isLoading={isLoading}
        />
        <MetricCard
          title="Active Jobs"
          value={formatNumber(activeJobs)}
          icon={Activity}
          color="amber"
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DonutChartWidget data={statusChartData} title="Jobs by Status" isLoading={isLoading} />
        <BarChartWidget
          data={processChartData}
          title="Jobs by Process Type"
          isLoading={isLoading}
          color={CHART_COLORS.teal}
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.by_process_type ?? []}
        isLoading={isLoading}
        emptyMessage="No production summary data available."
      />
    </section>
  );
}
