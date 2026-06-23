import { useEffect, useMemo } from 'react';
import clsx from 'clsx';
import {
  Banknote,
  Download,
  FileSpreadsheet,
  Loader2,
  Receipt,
  TrendingUp,
  Truck,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePageTitle, useReports, useRoleAccess } from '../../hooks';
import type { ReportKind } from '../../hooks/useReports';
import EmptyState from '../../components/ui/EmptyState';
import ErrorAlert from '../../components/ui/ErrorAlert';
import PageHeader from '../../components/ui/PageHeader';
import ReportChartsPanel from '../../components/reports/ReportChartsPanel';

type ReportCard = {
  kind: ReportKind;
  title: string;
  description: string;
  icon: LucideIcon;
  excelNote: string;
  roles: string[];
};

const reportCards: ReportCard[] = [
  {
    kind: 'customers',
    title: 'Customers',
    description:
      'Every customer with profile, full order history and line-level detail with revenue figures.',
    icon: Users,
    excelNote: 'Excel: Customers · Orders · Order Lines',
    roles: [
      'system_admin',
      'management_viewer',
      'sales_executive',
      'export_coordinator',
    ],
  },
  {
    kind: 'suppliers',
    title: 'Suppliers',
    description:
      'Every supplier with profile, raw materials supplied with reorder status and production usage.',
    icon: Truck,
    excelNote: 'Excel: Suppliers · Raw Materials · Production Usage',
    roles: ['system_admin', 'management_viewer', 'procurement_officer'],
  },
  {
    kind: 'sales',
    title: 'Sales',
    description:
      'Booked sales by order date, with VAT breakdown by channel, order and product.',
    icon: TrendingUp,
    excelNote: 'Excel: Summary · By Channel · By Order · By Product',
    roles: [
      'system_admin',
      'management_viewer',
      'sales_executive',
      'export_coordinator',
    ],
  },
  {
    kind: 'income',
    title: 'Income',
    description:
      'Realized income recognized on dispatch, with VAT breakdown by channel, order and product.',
    icon: Banknote,
    excelNote: 'Excel: Summary · By Channel · By Order · By Product',
    roles: ['system_admin', 'management_viewer'],
  },
  {
    kind: 'tax',
    title: 'Tax (VAT)',
    description:
      'Output VAT on dispatched sales — summary, monthly breakdown for filing, and per-order detail.',
    icon: Receipt,
    excelNote: 'Excel: Summary · VAT by Month · VAT Detail',
    roles: ['system_admin', 'management_viewer'],
  },
];

export default function ReportsPage() {
  usePageTitle('Reports & Analytics');

  const { currentRole } = useRoleAccess();
  const {
    exporting,
    fromDate,
    toDate,
    setFromDate,
    setToDate,
    clearRange,
    invalidRange,
    exportReport,
    activeReport,
    setActiveReport,
    chartData,
    isChartLoading,
    chartError,
  } = useReports();

  const availableCards = useMemo(
    () => reportCards.filter((card) => card.roles.includes(currentRole)),
    [currentRole],
  );

  useEffect(() => {
    if (availableCards.length === 0) {
      return;
    }
    const isActiveAvailable = availableCards.some(
      (card) => card.kind === activeReport,
    );
    if (!isActiveAvailable) {
      setActiveReport(availableCards[0].kind);
    }
  }, [availableCards, activeReport, setActiveReport]);

  const activeCard = availableCards.find((card) => card.kind === activeReport);
  const hasRange = Boolean(fromDate || toDate);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Visualise and export detailed reports, optionally for a custom date range"
        breadcrumbs={[{ label: 'Reports', path: '/reports' }]}
      />

      {availableCards.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-10">
          <EmptyState
            icon={FileSpreadsheet}
            title="No reports available"
            description="No reports are available for your role."
          />
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  From date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  To date
                </label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(event) => setToDate(event.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:outline-none"
                />
              </div>
              {hasRange ? (
                <button
                  type="button"
                  onClick={clearRange}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              ) : null}
              <p className="ml-auto max-w-xs text-xs text-gray-500">
                {invalidRange
                  ? 'From date must be on or before To date.'
                  : hasRange
                    ? 'Charts and exports are limited to the selected range.'
                    : 'Leave blank to include all available data.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {availableCards.map((card) => {
              const Icon = card.icon;
              const isActive = card.kind === activeReport;
              return (
                <button
                  key={card.kind}
                  type="button"
                  onClick={() => setActiveReport(card.kind)}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition',
                    isActive
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {card.title}
                </button>
              );
            })}
          </div>

          {activeCard ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {activeCard.title} Report
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {activeCard.description}
                    </p>
                    <p className="mt-2 text-xs font-medium text-gray-400">
                      {activeCard.excelNote}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportReport(activeCard.kind)}
                    disabled={exporting !== null || invalidRange}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {exporting === activeCard.kind ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {exporting === activeCard.kind
                      ? 'Generating…'
                      : 'Export to Excel'}
                  </button>
                </div>
              </div>

              {chartError ? (
                <ErrorAlert message={chartError} />
              ) : (
                <ReportChartsPanel data={chartData} isLoading={isChartLoading} />
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
