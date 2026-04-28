import clsx from 'clsx';
import {
  AlertTriangle,
  Clock,
  ClipboardCheck,
  Download,
  Factory,
  GitBranch,
  LayoutDashboard,
  RefreshCw,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePageTitle, useReports, useRoleAccess } from '../../hooks';
import type { ReportType } from '../../hooks/useReports';
import type { StockTurnoverReport } from '../../types/reports.types';
import { formatDateTime, formatNumber, formatWeight } from '../../utils/formatters';
import { getCategoryLabel } from '../../utils/inventory.utils';
import BarChartWidget from '../../components/charts/BarChartWidget';
import { CHART_COLORS } from '../../components/charts/chartColors';
import DataTable, { type Column } from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import ErrorAlert from '../../components/ui/ErrorAlert';
import PageHeader from '../../components/ui/PageHeader';
import DateRangePicker from '../../components/reports/DateRangePicker';
import AgingStockPanel from '../../components/reports/AgingStockPanel';
import ExportTraceabilityPanel from '../../components/reports/ExportTraceabilityPanel';
import ProductionSummaryPanel from '../../components/reports/ProductionSummaryPanel';
import QcPassRatePanel from '../../components/reports/QcPassRatePanel';
import ReorderAlertsPanel from '../../components/reports/ReorderAlertsPanel';
import SalesSummaryPanel from '../../components/reports/SalesSummaryPanel';
import StockSummaryPanel from '../../components/reports/StockSummaryPanel';
import TopProductsPanel from '../../components/reports/TopProductsPanel';

type RoleSlug =
  | 'system_admin'
  | 'management_viewer'
  | 'warehouse_officer'
  | 'procurement_officer'
  | 'production_supervisor'
  | 'qc_inspector'
  | 'sales_executive'
  | 'export_coordinator';

const reportAccess: Record<ReportType, RoleSlug[]> = {
  stock_summary: ['system_admin', 'management_viewer', 'warehouse_officer'],
  aging_stock: ['system_admin', 'management_viewer', 'warehouse_officer'],
  stock_turnover: ['system_admin', 'management_viewer', 'warehouse_officer'],
  reorder_alerts: ['system_admin', 'management_viewer', 'procurement_officer'],
  production_summary: ['system_admin', 'management_viewer', 'production_supervisor', 'qc_inspector'],
  qc_pass_rate: ['system_admin', 'management_viewer', 'production_supervisor', 'qc_inspector'],
  sales_summary: [
    'system_admin',
    'management_viewer',
    'sales_executive',
    'export_coordinator',
  ],
  top_products: ['system_admin', 'management_viewer', 'sales_executive'],
  export_traceability: ['system_admin', 'export_coordinator'],
};

type ReportNavItem = {
  key: ReportType;
  label: string;
  description: string;
  icon: LucideIcon;
};

const reportSections: Array<{ title: string; items: ReportNavItem[] }> = [
  {
    title: 'Inventory',
    items: [
      {
        key: 'stock_summary',
        label: 'Stock Summary',
        description: 'Overview of total items and inventory health.',
        icon: LayoutDashboard,
      },
      {
        key: 'aging_stock',
        label: 'Aging Stock',
        description: 'Items with no movement within the selected period.',
        icon: Clock,
      },
      {
        key: 'stock_turnover',
        label: 'Stock Turnover',
        description: 'Category-level turnover and movement summary.',
        icon: RefreshCw,
      },
      {
        key: 'reorder_alerts',
        label: 'Reorder Alerts',
        description: 'Raw materials below reorder thresholds.',
        icon: AlertTriangle,
      },
    ],
  },
  {
    title: 'Production',
    items: [
      {
        key: 'production_summary',
        label: 'Production Summary',
        description: 'Job throughput and yield performance.',
        icon: Factory,
      },
      {
        key: 'qc_pass_rate',
        label: 'QC Pass Rate',
        description: 'Quality inspection results by process type.',
        icon: ClipboardCheck,
      },
    ],
  },
  {
    title: 'Sales',
    items: [
      {
        key: 'sales_summary',
        label: 'Sales Summary',
        description: 'Order trends, revenue, and channel mix.',
        icon: TrendingUp,
      },
      {
        key: 'top_products',
        label: 'Top Products',
        description: 'Best-performing products by dispatch volume.',
        icon: Trophy,
      },
    ],
  },
  {
    title: 'Compliance',
    items: [
      {
        key: 'export_traceability',
        label: 'Export Traceability',
        description: 'Supply chain trace for export orders.',
        icon: GitBranch,
      },
    ],
  },
];

const exportableReports: ReportType[] = [
  'aging_stock',
  'reorder_alerts',
  'top_products',
  'sales_summary',
];

function StockTurnoverPanel({
  data,
  isLoading,
}: {
  data: StockTurnoverReport | null;
  isLoading: boolean;
}) {
  const rows = data?.by_category ?? [];

  const chartData = rows.map((row) => ({
    label: getCategoryLabel(row.category),
    value: row.turnover_rate,
  }));

  const columns: Column<StockTurnoverReport['by_category'][number]>[] = [
    {
      key: 'category',
      header: 'Category',
      render: (row) => <span className="font-medium text-gray-800">{getCategoryLabel(row.category)}</span>,
    },
    {
      key: 'opening_qty',
      header: 'Opening Qty',
      sortable: true,
      render: (row) => formatWeight(row.opening_qty),
    },
    {
      key: 'received_qty',
      header: 'Received Qty',
      sortable: true,
      render: (row) => formatWeight(row.received_qty),
    },
    {
      key: 'dispatched_qty',
      header: 'Dispatched Qty',
      sortable: true,
      render: (row) => formatWeight(row.dispatched_qty),
    },
    {
      key: 'closing_qty',
      header: 'Closing Qty',
      sortable: true,
      render: (row) => formatWeight(row.closing_qty),
    },
    {
      key: 'turnover_rate',
      header: 'Turnover Rate',
      sortable: true,
      render: (row) => `${formatNumber(row.turnover_rate, 2)}x`,
    },
  ];

  return (
    <section className="space-y-6">
      <BarChartWidget
        data={chartData}
        title="Stock Turnover by Category"
        valueFormatter={(value) => formatNumber(value, 2)}
        isLoading={isLoading}
        color={CHART_COLORS.teal}
      />

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        emptyMessage="No turnover data available."
      />
    </section>
  );
}

function ContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`metric-skeleton-${index}`} className="h-28 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-gray-100" />
      <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
    </div>
  );
}

export default function ReportsPage() {
  usePageTitle('Reports & Analytics');

  const {
    activeReport,
    dateRange,
    isLoading,
    error,
    stockSummary,
    agingStock,
    agingDaysThreshold,
    stockTurnover,
    productionSummary,
    qcPassRate,
    salesSummary,
    topProducts,
    reorderAlerts,
    traceabilityResult,
    setActiveReport,
    setDateRange,
    setAgingDays,
    fetchActiveReport,
    fetchTraceability,
    exportReportCsv,
  } = useReports();

  const { currentRole } = useRoleAccess();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasInitialized = useRef(false);
  const wasLoading = useRef(false);

  useEffect(() => {
    if (wasLoading.current && !isLoading) {
      setLastUpdated(new Date());
    }
    wasLoading.current = isLoading;
  }, [isLoading]);

  const accessibleSections = useMemo(() => {
    return reportSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          reportAccess[item.key]?.includes(currentRole as RoleSlug),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [currentRole]);

  const accessibleReports = useMemo(
    () => accessibleSections.flatMap((section) => section.items),
    [accessibleSections],
  );

  const reportMeta = useMemo(() => {
    return reportSections
      .flatMap((section) => section.items)
      .reduce((acc, item) => {
        acc[item.key] = item;
        return acc;
      }, {} as Record<ReportType, ReportNavItem>);
  }, []);

  useEffect(() => {
    if (accessibleReports.length === 0) {
      return;
    }

    const firstReport = accessibleReports[0];
    const isActiveAccessible = accessibleReports.some((item) => item.key === activeReport);

    if (!hasInitialized.current) {
      setActiveReport(firstReport.key);
      hasInitialized.current = true;
      return;
    }

    if (!isActiveAccessible) {
      setActiveReport(firstReport.key);
    }
  }, [accessibleReports, activeReport, setActiveReport]);

  const supportsExport = exportableReports.includes(activeReport);

  const hasExportData = useMemo(() => {
    switch (activeReport) {
      case 'aging_stock':
        return Boolean(agingStock?.length);
      case 'reorder_alerts':
        return Boolean(reorderAlerts?.alerts?.length);
      case 'top_products':
        return Boolean(topProducts?.products?.length);
      case 'sales_summary':
        return Boolean(salesSummary?.trend_data?.length);
      default:
        return false;
    }
  }, [activeReport, agingStock, reorderAlerts, topProducts, salesSummary]);

  const exportDisabled = !supportsExport || !hasExportData || isLoading;
  const reportTitle = reportMeta[activeReport]?.label ?? 'Reports';
  const reportDescription = reportMeta[activeReport]?.description ?? '';

  const lastUpdatedLabel = lastUpdated
    ? formatDateTime(lastUpdated.toISOString())
    : '—';

  const renderReportPanel = () => {
    switch (activeReport) {
      case 'stock_summary':
        return <StockSummaryPanel data={stockSummary} isLoading={isLoading} />;
      case 'aging_stock':
        return (
          <AgingStockPanel
            data={agingStock}
            isLoading={isLoading}
            daysThreshold={agingDaysThreshold}
            onDaysChange={setAgingDays}
            onExport={supportsExport ? exportReportCsv : undefined}
          />
        );
      case 'stock_turnover':
        return <StockTurnoverPanel data={stockTurnover} isLoading={isLoading} />;
      case 'production_summary':
        return <ProductionSummaryPanel data={productionSummary} isLoading={isLoading} />;
      case 'qc_pass_rate':
        return <QcPassRatePanel data={qcPassRate} isLoading={isLoading} />;
      case 'sales_summary':
        return <SalesSummaryPanel data={salesSummary} isLoading={isLoading} />;
      case 'top_products':
        return <TopProductsPanel data={topProducts} isLoading={isLoading} />;
      case 'reorder_alerts':
        return (
          <ReorderAlertsPanel
            data={reorderAlerts}
            isLoading={isLoading}
            onExport={supportsExport ? exportReportCsv : undefined}
          />
        );
      case 'export_traceability':
        return (
          <ExportTraceabilityPanel
            data={traceabilityResult}
            isLoading={isLoading}
            onSearch={fetchTraceability}
            isSearching={isLoading && activeReport === 'export_traceability'}
          />
        );
      default:
        return null;
    }
  };

  const reorderAlertCount = reorderAlerts?.total_alerts ?? 0;

  return (
    <section className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Inventory, production, sales and compliance insights"
        breadcrumbs={[{ label: 'Reports', path: '/reports' }]}
        actions={
          <button
            type="button"
            onClick={exportReportCsv}
            disabled={exportDisabled}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        }
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-55">
          <nav className="flex gap-4 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {accessibleSections.map((section) => (
              <div key={section.title} className="min-w-50 lg:min-w-0">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {section.title}
                </p>
                <div className="flex flex-row gap-2 lg:flex-col">
                  {section.items.map((item) => {
                    const isActive = item.key === activeReport;
                    const Icon = item.icon;
                    const isReorder = item.key === 'reorder_alerts' && reorderAlertCount > 0;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setActiveReport(item.key)}
                        className={clsx(
                          'flex items-center gap-2 rounded-lg border-l-4 px-3 py-2 text-sm font-medium transition',
                          isActive
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-transparent text-gray-600 hover:bg-gray-100',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="whitespace-nowrap">{item.label}</span>
                        {isReorder ? (
                          <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                            {reorderAlertCount}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex-1 space-y-6">
          {accessibleReports.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-10">
              <EmptyState
                icon={AlertTriangle}
                title="No reports available"
                description="No reports are available for your role."
              />
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{reportTitle}</h2>
                    <p className="mt-1 text-sm text-gray-500">{reportDescription}</p>
                  </div>

                  <div className="flex flex-col items-start gap-3">
                    <DateRangePicker
                      value={dateRange}
                      onChange={setDateRange}
                      showPeriodSelect={activeReport === 'sales_summary'}
                      disabled={isLoading}
                    />
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <button
                        type="button"
                        onClick={fetchActiveReport}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh
                      </button>
                      <span>Last updated: {lastUpdatedLabel}</span>
                    </div>
                  </div>
                </div>
              </div>

              {error ? (
                <ErrorAlert message={error} onRetry={fetchActiveReport} />
              ) : isLoading ? (
                <ContentSkeleton />
              ) : (
                renderReportPanel()
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
