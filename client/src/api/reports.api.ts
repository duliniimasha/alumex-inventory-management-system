import api from './axios';
import type {
  AgingStockItem,
  ExportTraceabilityReport,
  ProductionSummaryReport,
  QcPassRateReport,
  ReportDateRange,
  ReorderAlertsReport,
  SalesSummaryReport,
  StockSummaryReport,
  StockTurnoverReport,
  TopProductsReport,
} from '../types/reports.types';

interface ReportResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

type DashboardReportData = {
  summary?: Record<string, unknown>;
  chartData?: unknown[];
  tableData?: unknown[];
};

function extractTableData(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object' && Array.isArray((data as DashboardReportData).tableData)) {
    return (data as DashboardReportData).tableData ?? [];
  }

  return [];
}

function extractSummary(data: unknown): Record<string, unknown> | undefined {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const summary = (data as DashboardReportData).summary;
    if (summary && typeof summary === 'object') {
      return summary as Record<string, unknown>;
    }
  }

  return undefined;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return {};
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDateString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  return '';
}

function normalizeStatus(value: unknown): string {
  const text = String(value ?? '').trim().toLowerCase();
  return text.replace(/\s+/g, '_');
}

function normalizeChannel(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function toStockSummaryReport(data: unknown): StockSummaryReport {
  const summary = extractSummary(data) ?? {};
  const tableData = extractTableData(data);

  const categories = tableData.map((row) => {
    const record = toRecord(row);
    const totalQuantity = toNumber(record.total_quantity ?? record.totalQuantity ?? record.quantity);
    const totalItems = toNumber(
      record.total_items ?? record.totalItems ?? record.items ?? record.item_count ?? totalQuantity,
    );

    return {
      category: String(record.category ?? 'trading') as StockSummaryReport['categories'][number]['category'],
      total_items: totalItems,
      total_quantity: totalQuantity,
      below_reorder_count: toNumber(
        record.below_reorder_count ?? record.belowReorderCount,
      ),
    };
  });

  const grandTotalItems = categories.reduce((acc, row) => acc + row.total_items, 0);
  const grandTotalQuantity = categories.reduce((acc, row) => acc + row.total_quantity, 0);
  const totalBelowReorder =
    toNumber(summary.total_below_reorder ?? summary.totalBelowReorder ?? summary.belowReorderLevelCount) ||
    categories.reduce((acc, row) => acc + row.below_reorder_count, 0);

  return {
    categories,
    grand_total_items:
      toNumber(summary.grand_total_items ?? summary.grandTotalItems) || grandTotalItems,
    grand_total_quantity:
      toNumber(summary.grand_total_quantity ?? summary.grandTotalQuantity ?? summary.totalQuantity) ||
      grandTotalQuantity,
    total_below_reorder: totalBelowReorder,
  };
}

function toStockTurnoverReport(
  data: unknown,
  range: ReportDateRange,
): StockTurnoverReport {
  const summary = extractSummary(data) ?? {};
  const tableData = extractTableData(data);

  const byCategory = tableData.map((row) => {
    const record = toRecord(row);
    const openingQty = toNumber(record.opening_qty ?? record.openingQty ?? record.avgInventoryQty);
    const closingQty = toNumber(record.closing_qty ?? record.closingQty ?? record.avgInventoryQty);
    const dispatchedQty = toNumber(record.dispatched_qty ?? record.dispatchedQty);
    const receivedQty = toNumber(record.received_qty ?? record.receivedQty);

    return {
      category: String(record.category ?? 'trading') as StockTurnoverReport['by_category'][number]['category'],
      opening_qty: openingQty,
      received_qty: receivedQty,
      dispatched_qty: dispatchedQty,
      closing_qty: closingQty,
      turnover_rate: toNumber(record.turnover_rate ?? record.turnoverRatio ?? record.turnover_ratio),
    };
  });

  return {
    from_date: toDateString(summary.fromDate ?? summary.from_date ?? range.from_date),
    to_date: toDateString(summary.toDate ?? summary.to_date ?? range.to_date),
    by_category: byCategory,
  };
}

function toProductionSummaryReport(
  data: unknown,
  range: ReportDateRange,
): ProductionSummaryReport {
  const summary = extractSummary(data) ?? {};
  const tableData = extractTableData(data);
  const byStatus: ProductionSummaryReport['by_status'] = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    on_hold: 0,
    cancelled: 0,
  };

  const processMap = new Map<
    string,
    { job_count: number; total_input_kg: number; total_output_kg: number }
  >();

  for (const row of tableData) {
    const record = toRecord(row);
    const status = normalizeStatus(record.status ?? record.job_status);
    const count = toNumber(record.count ?? record.total ?? record.total_count ?? record._count);

    if (status in byStatus) {
      byStatus[status as keyof typeof byStatus] += count;
    }

    const processType = String(record.processType ?? record.process_type ?? 'other');
    const current = processMap.get(processType) ?? {
      job_count: 0,
      total_input_kg: 0,
      total_output_kg: 0,
    };

    current.job_count += count;
    current.total_input_kg += toNumber(record.total_input_kg ?? record.totalInputKg);
    current.total_output_kg += toNumber(record.total_output_kg ?? record.totalOutputKg);
    processMap.set(processType, current);
  }

  const byProcessType = Array.from(processMap.entries()).map(([processType, metrics]) => {
    const avgYield =
      metrics.total_input_kg > 0
        ? (metrics.total_output_kg / metrics.total_input_kg) * 100
        : 0;

    return {
      process_type: processType as ProductionSummaryReport['by_process_type'][number]['process_type'],
      job_count: metrics.job_count,
      total_input_kg: metrics.total_input_kg,
      total_output_kg: metrics.total_output_kg,
      avg_yield_percent: avgYield,
    };
  });

  const totalJobs = Object.values(byStatus).reduce((acc, value) => acc + value, 0);
  const completionRate = totalJobs > 0 ? (byStatus.completed / totalJobs) * 100 : 0;

  return {
    from_date: toDateString(summary.fromDate ?? summary.from_date ?? range.from_date),
    to_date: toDateString(summary.toDate ?? summary.to_date ?? range.to_date),
    by_status: byStatus,
    by_process_type: byProcessType,
    total_jobs: toNumber(summary.total_jobs ?? summary.totalJobs ?? totalJobs) || totalJobs,
    completion_rate: toNumber(summary.completion_rate ?? summary.completionRate ?? completionRate) ||
      completionRate,
  };
}

function toSalesSummaryReport(
  data: unknown,
  range: ReportDateRange,
): SalesSummaryReport {
  const summary = extractSummary(data) ?? {};
  const tableData = extractTableData(data);
  const byChannel: SalesSummaryReport['by_channel'] = {
    local: { order_count: 0, total_value: 0, units_dispatched: 0 },
    alumex_store: { order_count: 0, total_value: 0, units_dispatched: 0 },
    export: { order_count: 0, total_value: 0, units_dispatched: 0 },
  };

  const trendMap = new Map<string, { order_count: number; total_value: number }>();

  for (const row of tableData) {
    const record = toRecord(row);
    const channel = normalizeChannel(record.channel ?? record.sales_channel);
    const orderCount = toNumber(record.order_count ?? record.totalOrders ?? record.total_orders);
    const totalValue = toNumber(record.total_value ?? record.totalValue);
    const unitsDispatched = toNumber(record.units_dispatched ?? record.unitsDispatched);
    const periodLabel = toDateString(record.period_label ?? record.periodLabel ?? record.period);

    if (channel in byChannel) {
      byChannel[channel as keyof typeof byChannel].order_count += orderCount;
      byChannel[channel as keyof typeof byChannel].total_value += totalValue;
      byChannel[channel as keyof typeof byChannel].units_dispatched += unitsDispatched;
    }

    if (periodLabel) {
      const current = trendMap.get(periodLabel) ?? { order_count: 0, total_value: 0 };
      current.order_count += orderCount;
      current.total_value += totalValue;
      trendMap.set(periodLabel, current);
    }
  }

  const trendData = Array.from(trendMap.entries()).map(([label, values]) => ({
    period_label: label,
    order_count: values.order_count,
    total_value: values.total_value,
  }));

  const totalOrders =
    toNumber(summary.total_orders ?? summary.totalOrders) ||
    Object.values(byChannel).reduce((acc, item) => acc + item.order_count, 0);
  const totalValue =
    toNumber(summary.total_value ?? summary.totalValue) ||
    Object.values(byChannel).reduce((acc, item) => acc + item.total_value, 0);
  const totalUnits =
    toNumber(summary.total_units_dispatched ?? summary.totalUnitsDispatched) ||
    Object.values(byChannel).reduce((acc, item) => acc + item.units_dispatched, 0);

  return {
    from_date: toDateString(summary.fromDate ?? summary.from_date ?? range.from_date),
    to_date: toDateString(summary.toDate ?? summary.to_date ?? range.to_date),
    period: (summary.period ?? summary.salesPeriod ?? range.period ?? 'daily') as SalesSummaryReport['period'],
    total_orders: totalOrders,
    total_value: totalValue,
    total_units_dispatched: totalUnits,
    by_channel: byChannel,
    trend_data: trendData,
  };
}

function toTopProductsReport(
  data: unknown,
  range: ReportDateRange,
): TopProductsReport {
  const summary = extractSummary(data) ?? {};
  const tableData = extractTableData(data);

  const products = tableData.map((row, index) => {
    const record = toRecord(row);

    return {
      rank: toNumber(record.rank ?? index + 1),
      product_id: String(record.product_id ?? record.productId ?? ''),
      sku: String(record.sku ?? ''),
      name: String(record.name ?? record.productName ?? 'Unknown Product'),
      category: String(record.category ?? 'trading') as TopProductsReport['products'][number]['category'],
      total_dispatched_qty: toNumber(record.total_dispatched_qty ?? record.dispatchedQty ?? record.qty_dispatched),
      unit: String(record.unit ?? 'unit'),
      order_count: toNumber(record.order_count ?? record.orderCount),
    };
  });

  return {
    from_date: toDateString(summary.fromDate ?? summary.from_date ?? range.from_date),
    to_date: toDateString(summary.toDate ?? summary.to_date ?? range.to_date),
    products,
  };
}

function toReorderAlertsReport(data: unknown): ReorderAlertsReport {
  const summary = extractSummary(data) ?? {};
  const tableData = extractTableData(data);

  const alerts = tableData.map((row) => {
    const record = toRecord(row);
    const reorderLevel = toNumber(record.reorder_level ?? record.reorderLevel);
    const shortage = toNumber(record.shortage ?? record.shortfallKg ?? record.shortfall_kg);

    return {
      material_id: String(record.material_id ?? record.id ?? ''),
      material_type: String(record.material_type ?? record.materialType ?? ''),
      grade: (record.grade ?? null) as string | null,
      current_qty: toNumber(record.current_qty ?? record.quantityKg ?? record.quantity_kg),
      reorder_level: reorderLevel,
      shortage,
      shortage_percent: reorderLevel > 0 ? (shortage / reorderLevel) * 100 : 0,
      supplier: {
        id: String((record.supplier as Record<string, unknown>)?.id ?? ''),
        name: String((record.supplier as Record<string, unknown>)?.name ?? ''),
        country: String((record.supplier as Record<string, unknown>)?.country ?? ''),
        contact_email: String(
          (record.supplier as Record<string, unknown>)?.contact_email ??
            (record.supplier as Record<string, unknown>)?.contactEmail ??
            '',
        ),
      },
    };
  });

  return {
    alerts,
    total_alerts:
      toNumber(summary.total_alerts ?? summary.totalAlerts) || alerts.length,
  };
}

function toExportTraceabilityReport(data: unknown): ExportTraceabilityReport {
  const tableData = extractTableData(data);
  const firstRow = tableData[0] ? toRecord(tableData[0]) : {};
  const order = toRecord(firstRow.order);
  const orderLines = Array.isArray(firstRow.orderLines)
    ? (firstRow.orderLines as Array<Record<string, unknown>>)
    : [];

  const lines = orderLines.map((line) => {
    const product = toRecord(line.product);
    const reservations = Array.isArray(line.reservations)
      ? (line.reservations as Array<Record<string, unknown>>)
      : [];
    const firstReservation = reservations[0] ?? {};
    const item = toRecord(firstReservation.item);
    const job = toRecord(item.job);
    const material = toRecord(job.material);
    const supplier = toRecord(material.supplier);
    const qcInspections = Array.isArray(job.qcInspections)
      ? (job.qcInspections as Array<Record<string, unknown>>)
      : [];

    return {
      line_id: String(line.id ?? line.line_id ?? ''),
      product_sku: String(product.sku ?? line.product_sku ?? ''),
      product_name: String(product.name ?? line.product_name ?? ''),
      qty_dispatched: toNumber(line.qty_dispatched ?? line.qtyDispatched),
      inventory_item: item && item.id
        ? {
            id: String(item.id),
            location_code: String(item.locationCode ?? item.location_code ?? ''),
            warehouse_zone: String(item.warehouseZone ?? item.warehouse_zone ?? ''),
            received_at: toDateString(item.receivedAt ?? item.received_at),
            production_job: job && job.id
              ? {
                  id: String(job.id),
                  process_type: String(job.processType ?? job.process_type ?? ''),
                  completed_at: toDateString(job.completedAt ?? job.completed_at),
                  qc_inspections: qcInspections.map((inspection) => ({
                    result: String(inspection.status ?? inspection.result ?? '').toLowerCase(),
                    inspector_name: String(
                      inspection.inspectorName ?? inspection.inspector_name ?? '',
                    ),
                    inspected_at: toDateString(
                      inspection.inspectedAt ?? inspection.inspected_at,
                    ),
                  })),
                  raw_material: material && material.id
                    ? {
                        id: String(material.id),
                        material_type: String(
                          material.materialType ?? material.material_type ?? '',
                        ),
                        grade: (material.grade ?? null) as string | null,
                        supplier: {
                          name: String(supplier.name ?? ''),
                          country: String(supplier.country ?? ''),
                          certification: (supplier.certification ?? null) as string | null,
                        },
                      }
                    : null,
                }
              : null,
          }
        : null,
    };
  });

  const customer = toRecord(order.customer);

  return {
    order_id: String(order.id ?? ''),
    order_ref: String(order.orderRef ?? order.order_ref ?? order.id ?? ''),
    customer: {
      name: String(customer.name ?? ''),
      country: String(customer.country ?? ''),
      type: String(customer.type ?? ''),
    },
    dispatch_date: toDateString(order.dispatchDate ?? order.dispatch_date) || null,
    lines,
  };
}

function toAgingStockItem(row: Record<string, unknown>): AgingStockItem {
  return {
    item_id: (row.item_id ?? row.itemId ?? '') as string,
    product_sku: (row.product_sku ?? row.sku ?? '') as string,
    product_name: (row.product_name ?? row.productName ?? '') as string,
    category: (row.category ?? 'trading') as AgingStockItem['category'],
    warehouse_zone: (row.warehouse_zone ?? row.warehouseZone ?? 'main') as AgingStockItem['warehouse_zone'],
    location_code: (row.location_code ?? row.locationCode ?? '') as string,
    quantity: toNumber(row.quantity),
    unit: (row.unit ?? 'unit') as string,
    last_moved_at: (row.last_moved_at ?? row.lastMovedAt ?? null) as string | null,
    days_since_movement: toNumber(row.days_since_movement ?? row.daysSinceLastMovement),
    received_at: (row.received_at ?? row.receivedAt ?? '') as string,
  };
}

function toDateRangeParams(range?: ReportDateRange) {
  const params: Record<string, unknown> = {};

  if (range?.from_date) {
    params.from_date = range.from_date;
  }

  if (range?.to_date) {
    params.to_date = range.to_date;
  }

  if (range?.period) {
    params.period = range.period;
  }

  return params;
}

export async function getStockSummary(): Promise<StockSummaryReport> {
  const response = await api.get<ReportResponse<StockSummaryReport | DashboardReportData>>(
    '/reports/stock-summary',
  );
  const data = response.data.data;

  if (data && typeof data === 'object' && 'categories' in data) {
    return data as StockSummaryReport;
  }

  return toStockSummaryReport(data);
}

export async function getAgingStock(days?: number): Promise<AgingStockItem[]> {
  const params: Record<string, unknown> = {};

  if (days !== undefined) {
    params.days = days;
  }

  const response = await api.get<ReportResponse<AgingStockItem[] | DashboardReportData>>(
    '/reports/aging-stock',
    { params },
  );
  const tableData = extractTableData(response.data.data);
  return tableData.map((row) => toAgingStockItem(row as Record<string, unknown>));
}

export async function getStockTurnover(
  range: ReportDateRange,
): Promise<StockTurnoverReport> {
  const response = await api.get<ReportResponse<StockTurnoverReport | DashboardReportData>>(
    '/reports/stock-turnover',
    { params: toDateRangeParams(range) },
  );
  const data = response.data.data;

  if (data && typeof data === 'object' && 'by_category' in data) {
    return data as StockTurnoverReport;
  }

  return toStockTurnoverReport(data, range);
}

export async function getProductionSummary(
  range: ReportDateRange,
): Promise<ProductionSummaryReport> {
  const response = await api.get<ReportResponse<ProductionSummaryReport | DashboardReportData>>(
    '/reports/production-summary',
    { params: toDateRangeParams(range) },
  );
  const data = response.data.data;

  if (data && typeof data === 'object' && 'by_process_type' in data && 'by_status' in data) {
    return data as ProductionSummaryReport;
  }

  return toProductionSummaryReport(data, range);
}

export async function getQcPassRate(
  range: ReportDateRange,
): Promise<QcPassRateReport> {
  const response = await api.get<ReportResponse<QcPassRateReport | DashboardReportData>>(
    '/reports/qc-pass-rate',
    { params: toDateRangeParams(range) },
  );
  const data = response.data.data;

  if (
    data &&
    typeof data === 'object' &&
    'overall' in data &&
    'by_process_type' in data
  ) {
    return data as QcPassRateReport;
  }

  const summary = extractSummary(data) ?? {};
  const tableData = extractTableData(data);

  const byProcess = tableData.map((row) => {
    const record = toRecord(row);
    const pass = toNumber(record.pass ?? record.passCount ?? record.pass_count);
    const hold = toNumber(record.hold ?? record.holdCount ?? record.hold_count);
    const reject = toNumber(record.reject ?? record.rejectCount ?? record.reject_count);
    const total = pass + hold + reject;

    return {
      process_type: String(record.processType ?? record.process_type ?? 'other'),
      pass,
      hold,
      reject,
      pass_rate: toNumber(record.passRatePct ?? record.pass_rate_pct ?? record.pass_rate),
      total,
    };
  });

  const totalPass = byProcess.reduce((acc, row) => acc + row.pass, 0);
  const totalHold = byProcess.reduce((acc, row) => acc + row.hold, 0);
  const totalReject = byProcess.reduce((acc, row) => acc + row.reject, 0);
  const totalReviewed = totalPass + totalHold + totalReject;
  const overallPassRate =
    toNumber(summary.overallPassRatePct) ||
    (totalReviewed > 0 ? (totalPass / totalReviewed) * 100 : 0);

  return {
    from_date: toDateString(summary.fromDate ?? summary.from_date),
    to_date: toDateString(summary.toDate ?? summary.to_date),
    overall: {
      pass: totalPass,
      hold: totalHold,
      reject: totalReject,
      pass_rate: overallPassRate,
    },
    by_process_type: byProcess,
  };
}

export async function getSalesSummary(
  range: ReportDateRange,
): Promise<SalesSummaryReport> {
  const response = await api.get<ReportResponse<SalesSummaryReport | DashboardReportData>>(
    '/reports/sales-summary',
    { params: toDateRangeParams(range) },
  );
  const data = response.data.data;

  if (data && typeof data === 'object' && 'by_channel' in data && 'trend_data' in data) {
    return data as SalesSummaryReport;
  }

  return toSalesSummaryReport(data, range);
}

export async function getTopProducts(
  range: ReportDateRange,
): Promise<TopProductsReport> {
  const response = await api.get<ReportResponse<TopProductsReport | DashboardReportData>>(
    '/reports/top-products',
    { params: toDateRangeParams(range) },
  );
  const data = response.data.data;

  if (data && typeof data === 'object' && 'products' in data) {
    return data as TopProductsReport;
  }

  return toTopProductsReport(data, range);
}

export async function getReorderAlerts(): Promise<ReorderAlertsReport> {
  const response = await api.get<ReportResponse<ReorderAlertsReport | DashboardReportData>>(
    '/reports/reorder-alerts',
  );
  const data = response.data.data;

  if (data && typeof data === 'object' && 'alerts' in data) {
    return data as ReorderAlertsReport;
  }

  return toReorderAlertsReport(data);
}

export async function getExportTraceability(
  orderId: string,
): Promise<ExportTraceabilityReport> {
  const response = await api.get<ReportResponse<ExportTraceabilityReport | DashboardReportData>>(
    `/reports/export-traceability/${orderId}`,
  );
  const data = response.data.data;

  if (data && typeof data === 'object' && 'order_id' in data) {
    return data as ExportTraceabilityReport;
  }

  return toExportTraceabilityReport(data);
}
