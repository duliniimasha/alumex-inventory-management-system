import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QcStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import type { ReportDateRange, SalesPeriod } from './reports.routes';

interface DashboardReportData {
  summary: Record<string, unknown>;
  chartData: unknown[];
  tableData: unknown[];
}

interface RoleAccessConfig {
  relevantRoles: Role[];
}

interface StockSummaryRow {
  category: string;
  total_items: number;
  total_quantity: number;
  total_value: number;
}

interface AgingStockRow {
  item_id: string;
  product_id: string;
  sku: string;
  product_name: string;
  category: string;
  quantity: number;
  reserved_quantity: number;
  warehouse_zone: string;
  location_code: string;
  unit: string;
  received_at: Date;
  last_moved_at: Date;
  days_since_last_movement: number;
}

interface TurnoverRow {
  category: string;
  opening_qty: number;
  received_qty: number;
  dispatched_qty: number;
  closing_qty: number;
  turnover_ratio: number;
}

interface QcPassRateRow {
  process_type: string;
  pass_count: number;
  hold_count: number;
  reject_count: number;
  pass_rate_pct: number;
}

interface SalesSummaryRow {
  period_label: Date;
  channel: string | null;
  total_orders: number;
  total_value: number;
  units_dispatched: number;
}

interface TraceabilitySummary {
  orderId: string;
  channel: string | null;
  status: string;
  customer: {
    id: string;
    name: string;
    country: string | null;
    contactEmail: string | null;
  };
  lineCount: number;
  totalDispatchedQty: number;
  tracedInventoryItems: number;
  tracedJobs: number;
  tracedQcInspections: number;
  tracedRawMaterialBatches: number;
}

const BASE_ALLOWED_ROLES = new Set<Role>([
  Role.SYSTEM_ADMIN,
  Role.MANAGEMENT_VIEWER,
]);

const ROLE_ACCESS: Record<string, RoleAccessConfig> = {
  inventory: {
    relevantRoles: [Role.WAREHOUSE_OFFICER],
  },
  production: {
    relevantRoles: [Role.PRODUCTION_SUPERVISOR, Role.QC_INSPECTOR],
  },
  sales: {
    relevantRoles: [Role.SALES_EXECUTIVE, Role.EXPORT_COORDINATOR],
  },
  reorder: {
    relevantRoles: [Role.PROCUREMENT_OFFICER],
  },
  export: {
    relevantRoles: [Role.EXPORT_COORDINATOR],
  },
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  async getStockSummary(
    dateRange: ReportDateRange,
    actorUserId?: string,
  ): Promise<DashboardReportData> {
    try {
      await this.assertRoleAccess(
        actorUserId,
        ROLE_ACCESS.inventory.relevantRoles,
      );

      const stockDateFilter = this.buildDateFilterSql(
        'i.received_at',
        dateRange,
        'AND',
      );

      const rows = await this.prisma.$queryRaw<StockSummaryRow[]>(Prisma.sql`
        SELECT
          p.category AS category,
          COUNT(DISTINCT i.item_id)::int AS total_items,
          COALESCE(SUM(i.quantity), 0)::double precision AS total_quantity,
          COALESCE(
            SUM(i.quantity * COALESCE(price.avg_unit_price, 0)),
            0
          )::double precision AS total_value
        FROM inventory_items i
        INNER JOIN products p ON p.product_id = i.product_id
        LEFT JOIN (
          SELECT
            product_id,
            AVG(unit_price)::double precision AS avg_unit_price
          FROM order_lines
          GROUP BY product_id
        ) price ON price.product_id = i.product_id
        WHERE 1 = 1
        ${stockDateFilter}
        GROUP BY p.category
        ORDER BY p.category ASC
      `);

      const belowReorderLevelCount = await this.prisma.rawMaterial.count({
        where: {
          deletedAt: null,
          quantityKg: {
            lt: this.prisma.rawMaterial.fields.reorderLevel,
          },
        },
      });

      return {
        summary: {
          categories: rows.length,
          totalItems: rows.reduce((acc, row) => acc + row.total_items, 0),
          totalQuantity: rows.reduce((acc, row) => acc + row.total_quantity, 0),
          totalValue: rows.reduce((acc, row) => acc + row.total_value, 0),
          belowReorderLevelCount,
        },
        chartData: rows.map((row) => ({
          category: row.category,
          totalItems: row.total_items,
          totalQuantity: row.total_quantity,
          totalValue: row.total_value,
        })),
        tableData: rows.map((row) => ({
          category: row.category,
          totalItems: row.total_items,
          totalQuantity: row.total_quantity,
          totalValue: row.total_value,
          belowReorderCount: 0,
        })),
      };
    } catch (error) {
      this.handleError(error, 'Failed to generate stock summary report');
    }
  }

  async getAgingStock(
    days: number,
    dateRange: ReportDateRange,
    actorUserId?: string,
  ): Promise<DashboardReportData> {
    try {
      await this.assertRoleAccess(
        actorUserId,
        ROLE_ACCESS.inventory.relevantRoles,
      );

      const safeDays =
        Number.isFinite(days) && days > 0 ? Math.floor(days) : 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - safeDays);

      const receivedDateFilter = this.buildDateFilterSql(
        'i.received_at',
        dateRange,
        'AND',
      );

      const rows = await this.prisma.$queryRaw<AgingStockRow[]>(Prisma.sql`
        SELECT
          i.item_id,
          i.product_id,
          p.sku,
          p.name AS product_name,
          p.category,
          i.quantity,
          i.reserved_quantity,
          i.warehouse_zone,
          i.location_code,
          p.unit,
          i.received_at,
          COALESCE(MAX(sm.moved_at), i.received_at) AS last_moved_at,
          EXTRACT(
            DAY FROM (NOW() - COALESCE(MAX(sm.moved_at), i.received_at))
          )::int AS days_since_last_movement
        FROM inventory_items i
        INNER JOIN products p ON p.product_id = i.product_id
        LEFT JOIN stock_movements sm ON sm.item_id = i.item_id
        WHERE 1 = 1
        ${receivedDateFilter}
        GROUP BY
          i.item_id,
          i.product_id,
          p.sku,
          p.name,
          p.category,
          i.quantity,
          i.reserved_quantity,
          i.warehouse_zone,
          i.location_code,
          p.unit,
          i.received_at
        HAVING COALESCE(MAX(sm.moved_at), i.received_at) < ${cutoffDate}
        ORDER BY last_moved_at ASC
      `);

      return {
        summary: {
          cutoffDate,
          thresholdDays: safeDays,
          totalItems: rows.length,
          totalQuantity: rows.reduce((acc, row) => acc + row.quantity, 0),
        },
        chartData: rows.map((row) => ({
          itemId: row.item_id,
          category: row.category,
          quantity: row.quantity,
          daysSinceLastMovement: row.days_since_last_movement,
        })),
        tableData: rows.map((row) => ({
          itemId: row.item_id,
          productId: row.product_id,
          sku: row.sku,
          productName: row.product_name,
          category: row.category,
          quantity: row.quantity,
          reservedQuantity: row.reserved_quantity,
          warehouseZone: row.warehouse_zone,
          locationCode: row.location_code,
          unit: row.unit,
          receivedAt: row.received_at,
          lastMovedAt: row.last_moved_at,
          daysSinceLastMovement: row.days_since_last_movement,
        })),
      };
    } catch (error) {
      this.handleError(error, 'Failed to generate aging stock report');
    }
  }

  async getStockTurnover(
    dateRange: ReportDateRange,
    actorUserId?: string,
  ): Promise<DashboardReportData> {
    try {
      await this.assertRoleAccess(
        actorUserId,
        ROLE_ACCESS.inventory.relevantRoles,
      );

      const normalizedRange = this.normalizeDateRange(dateRange, 90);

      const rows = await this.prisma.$queryRaw<TurnoverRow[]>(Prisma.sql`
        WITH current_inventory AS (
          SELECT
            p.category AS category,
            COALESCE(SUM(i.quantity), 0)::double precision AS current_qty
          FROM inventory_items i
          INNER JOIN products p ON p.product_id = i.product_id
          GROUP BY p.category
        ),
        movement_offsets AS (
          SELECT
            p.category AS category,
            COALESCE(
              SUM(sm.quantity) FILTER (WHERE sm.moved_at >= ${normalizedRange.fromDate}),
              0
            )::double precision AS delta_after_from,
            COALESCE(
              SUM(sm.quantity) FILTER (WHERE sm.moved_at > ${normalizedRange.toDate}),
              0
            )::double precision AS delta_after_to,
            COALESCE(
              SUM(
                CASE
                  WHEN sm.movement_type IN ('RECEIVE', 'TRANSFER_IN', 'RETURN')
                    AND sm.moved_at >= ${normalizedRange.fromDate}
                    AND sm.moved_at <= ${normalizedRange.toDate}
                  THEN ABS(sm.quantity)
                  ELSE 0
                END
              ),
              0
            )::double precision AS received_qty,
            COALESCE(
              SUM(
                CASE
                  WHEN sm.movement_type = 'DISPATCH'
                    AND sm.moved_at >= ${normalizedRange.fromDate}
                    AND sm.moved_at <= ${normalizedRange.toDate}
                  THEN ABS(sm.quantity)
                  ELSE 0
                END
              ),
              0
            )::double precision AS dispatched_qty
          FROM stock_movements sm
          INNER JOIN inventory_items i ON i.item_id = sm.item_id
          INNER JOIN products p ON p.product_id = i.product_id
          GROUP BY p.category
        )
        SELECT
          ci.category,
          (
            COALESCE(ci.current_qty, 0) - COALESCE(mo.delta_after_from, 0)
          )::double precision AS opening_qty,
          COALESCE(mo.received_qty, 0)::double precision AS received_qty,
          COALESCE(mo.dispatched_qty, 0)::double precision AS dispatched_qty,
          (
            COALESCE(ci.current_qty, 0) - COALESCE(mo.delta_after_to, 0)
          )::double precision AS closing_qty,
          CASE
            WHEN (
              (
                (
                  COALESCE(ci.current_qty, 0) - COALESCE(mo.delta_after_from, 0)
                )
                +
                (
                  COALESCE(ci.current_qty, 0) - COALESCE(mo.delta_after_to, 0)
                )
              ) / 2.0
            ) <= 0
            THEN 0
            ELSE
              COALESCE(mo.dispatched_qty, 0)
              /
              (
                (
                  (
                    COALESCE(ci.current_qty, 0) - COALESCE(mo.delta_after_from, 0)
                  )
                  +
                  (
                    COALESCE(ci.current_qty, 0) - COALESCE(mo.delta_after_to, 0)
                  )
                ) / 2.0
              )
          END AS turnover_ratio
        FROM current_inventory ci
        LEFT JOIN movement_offsets mo ON mo.category = ci.category
        ORDER BY ci.category ASC
      `);

      return {
        summary: {
          fromDate: normalizedRange.fromDate,
          toDate: normalizedRange.toDate,
          categories: rows.length,
          totalOpeningQty: rows.reduce((acc, row) => acc + row.opening_qty, 0),
          totalReceivedQty: rows.reduce(
            (acc, row) => acc + row.received_qty,
            0,
          ),
          totalDispatchedQty: rows.reduce(
            (acc, row) => acc + row.dispatched_qty,
            0,
          ),
          totalClosingQty: rows.reduce((acc, row) => acc + row.closing_qty, 0),
          averageTurnoverRatio:
            rows.length === 0
              ? 0
              : rows.reduce((acc, row) => acc + row.turnover_ratio, 0) /
                rows.length,
        },
        chartData: rows.map((row) => ({
          category: row.category,
          turnoverRatio: row.turnover_ratio,
        })),
        tableData: rows.map((row) => ({
          category: row.category,
          openingQty: row.opening_qty,
          receivedQty: row.received_qty,
          dispatchedQty: row.dispatched_qty,
          closingQty: row.closing_qty,
          turnoverRatio: row.turnover_ratio,
        })),
      };
    } catch (error) {
      this.handleError(error, 'Failed to generate stock turnover report');
    }
  }

  async getProductionSummary(
    dateRange: ReportDateRange,
    actorUserId?: string,
  ): Promise<DashboardReportData> {
    try {
      await this.assertRoleAccess(
        actorUserId,
        ROLE_ACCESS.production.relevantRoles,
      );

      const where: Prisma.ProductionJobWhereInput = {
        deletedAt: null,
      };

      if (dateRange.fromDate || dateRange.toDate) {
        where.startedAt = {};

        if (dateRange.fromDate) {
          where.startedAt.gte = dateRange.fromDate;
        }

        if (dateRange.toDate) {
          where.startedAt.lte = dateRange.toDate;
        }
      }

      const grouped = await this.prisma.productionJob.groupBy({
        by: ['status', 'processType'],
        where,
        _count: {
          _all: true,
        },
        _sum: {
          inputQtyKg: true,
          outputQtyKg: true,
        },
        orderBy: [{ processType: 'asc' }, { status: 'asc' }],
      });

      return {
        summary: {
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
          totalJobs: grouped.reduce((acc, row) => acc + row._count._all, 0),
          processTypes: new Set(grouped.map((row) => row.processType)).size,
        },
        chartData: grouped.map((row) => ({
          processType: row.processType,
          status: row.status,
          count: row._count._all,
          totalInputKg: row._sum.inputQtyKg ?? 0,
          totalOutputKg: row._sum.outputQtyKg ?? 0,
        })),
        tableData: grouped.map((row) => ({
          processType: row.processType,
          status: row.status,
          count: row._count._all,
          totalInputKg: row._sum.inputQtyKg ?? 0,
          totalOutputKg: row._sum.outputQtyKg ?? 0,
        })),
      };
    } catch (error) {
      this.handleError(error, 'Failed to generate production summary report');
    }
  }

  async getQcPassRate(
    dateRange: ReportDateRange,
    actorUserId?: string,
  ): Promise<DashboardReportData> {
    try {
      await this.assertRoleAccess(
        actorUserId,
        ROLE_ACCESS.production.relevantRoles,
      );

      const inspectedFilter = this.buildDateFilterSql(
        'qi.inspected_at',
        dateRange,
        'AND',
      );

      const rows = await this.prisma.$queryRaw<QcPassRateRow[]>(Prisma.sql`
        SELECT
          pj.process_type,
          COALESCE(
            SUM(CASE WHEN qi.status::text = ${QcStatus.PASS} THEN 1 ELSE 0 END),
            0
          )::int AS pass_count,
          COALESCE(
            SUM(CASE WHEN qi.status::text = ${QcStatus.HOLD} THEN 1 ELSE 0 END),
            0
          )::int AS hold_count,
          COALESCE(
            SUM(CASE WHEN qi.status::text = ${QcStatus.REJECT} THEN 1 ELSE 0 END),
            0
          )::int AS reject_count,
          CASE
            WHEN COALESCE(
              SUM(
                CASE
                  WHEN qi.status::text IN (${QcStatus.PASS}, ${QcStatus.HOLD}, ${QcStatus.REJECT})
                  THEN 1
                  ELSE 0
                END
              ),
              0
            ) = 0
            THEN 0
            ELSE (
              SUM(CASE WHEN qi.status::text = ${QcStatus.PASS} THEN 1 ELSE 0 END)::double precision
              /
              SUM(
                CASE
                  WHEN qi.status::text IN (${QcStatus.PASS}, ${QcStatus.HOLD}, ${QcStatus.REJECT})
                  THEN 1
                  ELSE 0
                END
              )
            ) * 100
          END AS pass_rate_pct
        FROM qc_inspections qi
        INNER JOIN production_jobs pj ON pj.job_id = qi.job_id
        WHERE pj.deleted_at IS NULL
        ${inspectedFilter}
        GROUP BY pj.process_type
        ORDER BY pj.process_type ASC
      `);

      return {
        summary: {
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
          processTypes: rows.length,
          totalInspections: rows.reduce(
            (acc, row) =>
              acc + row.pass_count + row.hold_count + row.reject_count,
            0,
          ),
          overallPassRatePct: this.computeOverallPassRate(rows),
        },
        chartData: rows.map((row) => ({
          processType: row.process_type,
          passRatePct: row.pass_rate_pct,
        })),
        tableData: rows.map((row) => ({
          processType: row.process_type,
          passCount: row.pass_count,
          holdCount: row.hold_count,
          rejectCount: row.reject_count,
          passRatePct: row.pass_rate_pct,
        })),
      };
    } catch (error) {
      this.handleError(error, 'Failed to generate QC pass rate report');
    }
  }

  async getSalesSummary(
    period: SalesPeriod,
    dateRange: ReportDateRange,
    actorUserId?: string,
  ): Promise<DashboardReportData> {
    try {
      await this.assertRoleAccess(actorUserId, ROLE_ACCESS.sales.relevantRoles);

      const truncUnit = this.mapSalesPeriodToSqlUnit(period);
      const dateFilter = this.buildDateFilterSql(
        'so.order_date',
        dateRange,
        'AND',
      );

      const rows = await this.prisma.$queryRaw<SalesSummaryRow[]>(Prisma.sql`
        SELECT
          date_trunc(${Prisma.raw(`'${truncUnit}'`)}, so.order_date) AS period_label,
          so.channel,
          COUNT(DISTINCT so.order_id)::int AS total_orders,
          COALESCE(SUM(ol.qty_ordered * ol.unit_price), 0)::double precision AS total_value,
          COALESCE(SUM(COALESCE(ol.qty_dispatched, 0)), 0)::double precision AS units_dispatched
        FROM sales_orders so
        LEFT JOIN order_lines ol ON ol.order_id = so.order_id
        WHERE 1 = 1
        ${dateFilter}
        GROUP BY period_label, so.channel
        ORDER BY period_label ASC, so.channel ASC
      `);

      return {
        summary: {
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
          period,
          rows: rows.length,
          totalOrders: rows.reduce((acc, row) => acc + row.total_orders, 0),
          totalValue: rows.reduce((acc, row) => acc + row.total_value, 0),
          totalUnitsDispatched: rows.reduce(
            (acc, row) => acc + row.units_dispatched,
            0,
          ),
        },
        chartData: rows.map((row) => ({
          periodLabel: row.period_label,
          channel: row.channel ?? 'unknown',
          totalValue: row.total_value,
          unitsDispatched: row.units_dispatched,
        })),
        tableData: rows.map((row) => ({
          periodLabel: row.period_label,
          channel: row.channel ?? 'unknown',
          totalOrders: row.total_orders,
          totalValue: row.total_value,
          unitsDispatched: row.units_dispatched,
        })),
      };
    } catch (error) {
      this.handleError(error, 'Failed to generate sales summary report');
    }
  }

  async getTopProducts(
    dateRange: ReportDateRange,
    actorUserId?: string,
  ): Promise<DashboardReportData> {
    try {
      await this.assertRoleAccess(actorUserId, ROLE_ACCESS.sales.relevantRoles);

      const where: Prisma.OrderLineWhereInput = {
        qtyDispatched: {
          gt: 0,
        },
      };

      if (dateRange.fromDate || dateRange.toDate) {
        const dispatchDateFilter: Prisma.DateTimeNullableFilter<'SalesOrder'> =
          {};

        if (dateRange.fromDate) {
          dispatchDateFilter.gte = dateRange.fromDate;
        }

        if (dateRange.toDate) {
          dispatchDateFilter.lte = dateRange.toDate;
        }

        where.order = {
          dispatchDate: dispatchDateFilter,
        };
      }

      const grouped = await this.prisma.orderLine.groupBy({
        by: ['productId'],
        where,
        _sum: {
          qtyDispatched: true,
        },
        _count: {
          _all: true,
        },
        orderBy: {
          _sum: {
            qtyDispatched: 'desc',
          },
        },
        take: 10,
      });

      if (grouped.length === 0) {
        return {
          summary: {
            fromDate: dateRange.fromDate,
            toDate: dateRange.toDate,
            totalProducts: 0,
            totalDispatchedQty: 0,
          },
          chartData: [],
          tableData: [],
        };
      }

      const products = await this.prisma.product.findMany({
        where: {
          id: {
            in: grouped.map((row) => row.productId),
          },
        },
        select: {
          id: true,
          sku: true,
          name: true,
          category: true,
          unit: true,
        },
      });

      const productById = new Map(
        products.map((product) => [product.id, product]),
      );

      const tableData = grouped.map((row, index) => {
        const product = productById.get(row.productId);

        return {
          rank: index + 1,
          productId: row.productId,
          sku: product?.sku ?? 'UNKNOWN',
          name: product?.name ?? 'Unknown Product',
          category: product?.category ?? 'Unknown',
          unit: product?.unit ?? 'unit',
          dispatchedQty: row._sum.qtyDispatched ?? 0,
          orderCount: row._count._all,
        };
      });

      return {
        summary: {
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
          totalProducts: tableData.length,
          totalDispatchedQty: tableData.reduce(
            (acc, row) => acc + row.dispatchedQty,
            0,
          ),
        },
        chartData: tableData.map((row) => ({
          product: row.name,
          sku: row.sku,
          dispatchedQty: row.dispatchedQty,
        })),
        tableData,
      };
    } catch (error) {
      this.handleError(error, 'Failed to generate top products report');
    }
  }

  async getReorderAlerts(
    dateRange: ReportDateRange,
    actorUserId?: string,
  ): Promise<DashboardReportData> {
    try {
      await this.assertRoleAccess(
        actorUserId,
        ROLE_ACCESS.reorder.relevantRoles,
      );

      const alerts = await this.prisma.rawMaterial.findMany({
        where: {
          deletedAt: null,
          supplier: {
            deletedAt: null,
          },
          quantityKg: {
            lt: this.prisma.rawMaterial.fields.reorderLevel,
          },
        },
        select: {
          id: true,
          materialCategory: true,
          materialType: true,
          grade: true,
          quantityKg: true,
          reorderLevel: true,
          unit: true,
          supplier: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
              country: true,
            },
          },
        },
        orderBy: [{ materialCategory: 'asc' }, { materialType: 'asc' }],
      });

      return {
        summary: {
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
          totalAlerts: alerts.length,
          totalShortfallKg: alerts.reduce(
            (acc, item) =>
              acc + Math.max(item.reorderLevel - item.quantityKg, 0),
            0,
          ),
        },
        chartData: alerts.map((item) => ({
          materialType: item.materialType,
          materialCategory: item.materialCategory,
          shortfall: Math.max(item.reorderLevel - item.quantityKg, 0),
        })),
        tableData: alerts.map((item) => ({
          id: item.id,
          materialCategory: item.materialCategory,
          materialType: item.materialType,
          grade: item.grade,
          quantityKg: item.quantityKg,
          reorderLevel: item.reorderLevel,
          unit: item.unit,
          shortfallKg: Math.max(item.reorderLevel - item.quantityKg, 0),
          supplier: item.supplier,
        })),
      };
    } catch (error) {
      this.handleError(error, 'Failed to generate reorder alerts report');
    }
  }

  async getExportTraceability(
    orderId: string,
    dateRange: ReportDateRange,
    actorUserId?: string,
  ): Promise<DashboardReportData> {
    try {
      await this.assertRoleAccess(
        actorUserId,
        ROLE_ACCESS.export.relevantRoles,
      );

      const orderWhere: Prisma.SalesOrderWhereInput = {
        id: orderId,
        channel: {
          equals: 'export',
          mode: 'insensitive',
        },
      };

      if (dateRange.fromDate || dateRange.toDate) {
        orderWhere.orderDate = {};

        if (dateRange.fromDate) {
          orderWhere.orderDate.gte = dateRange.fromDate;
        }

        if (dateRange.toDate) {
          orderWhere.orderDate.lte = dateRange.toDate;
        }
      }

      const order = await this.prisma.salesOrder.findFirst({
        where: orderWhere,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              country: true,
              contactEmail: true,
            },
          },
          orderLines: {
            include: {
              product: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  category: true,
                  finishType: true,
                  unit: true,
                },
              },
              reservations: {
                include: {
                  item: {
                    include: {
                      job: {
                        include: {
                          die: {
                            select: {
                              id: true,
                              profileCode: true,
                              productCategory: true,
                            },
                          },
                          material: {
                            include: {
                              supplier: {
                                select: {
                                  id: true,
                                  name: true,
                                  contactEmail: true,
                                  country: true,
                                },
                              },
                            },
                          },
                          qcInspections: {
                            where:
                              dateRange.fromDate || dateRange.toDate
                                ? {
                                    inspectedAt: {
                                      ...(dateRange.fromDate
                                        ? { gte: dateRange.fromDate }
                                        : {}),
                                      ...(dateRange.toDate
                                        ? { lte: dateRange.toDate }
                                        : {}),
                                    },
                                  }
                                : undefined,
                            orderBy: [{ inspectedAt: 'desc' }, { id: 'desc' }],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { id: 'asc' },
          },
        },
      });

      if (!order) {
        throw new NotFoundException(
          `Export order with id ${orderId} was not found for the provided filters`,
        );
      }

      const jobIds = new Set<string>();
      const inspectionIds = new Set<string>();
      const materialIds = new Set<string>();
      const inventoryItemIds = new Set<string>();

      for (const line of order.orderLines) {
        for (const reservation of line.reservations) {
          inventoryItemIds.add(reservation.item.id);
          if (reservation.item.job) {
            jobIds.add(reservation.item.job.id);
            materialIds.add(reservation.item.job.materialId);

            for (const inspection of reservation.item.job.qcInspections) {
              inspectionIds.add(inspection.id);
            }
          }
        }
      }

      const summary: TraceabilitySummary = {
        orderId: order.id,
        channel: order.channel,
        status: order.status,
        customer: {
          id: order.customer.id,
          name: order.customer.name,
          country: order.customer.country,
          contactEmail: order.customer.contactEmail,
        },
        lineCount: order.orderLines.length,
        totalDispatchedQty: order.orderLines.reduce(
          (acc, line) => acc + (line.qtyDispatched ?? 0),
          0,
        ),
        tracedInventoryItems: inventoryItemIds.size,
        tracedJobs: jobIds.size,
        tracedQcInspections: inspectionIds.size,
        tracedRawMaterialBatches: materialIds.size,
      };

      return {
        summary: {
          ...summary,
        },
        chartData: [
          {
            label: 'Order Lines',
            value: summary.lineCount,
          },
          {
            label: 'Inventory Items',
            value: summary.tracedInventoryItems,
          },
          {
            label: 'Production Jobs',
            value: summary.tracedJobs,
          },
          {
            label: 'QC Inspections',
            value: summary.tracedQcInspections,
          },
          {
            label: 'Raw Material Batches',
            value: summary.tracedRawMaterialBatches,
          },
        ],
        tableData: [
          {
            order: {
              id: order.id,
              channel: order.channel,
              status: order.status,
              orderDate: order.orderDate,
              dispatchDate: order.dispatchDate,
              customer: order.customer,
            },
            orderLines: order.orderLines,
          },
        ],
      };
    } catch (error) {
      this.handleError(error, 'Failed to generate export traceability report');
    }
  }

  private async assertRoleAccess(
    actorUserId: string | undefined,
    relevantRoles: Role[],
  ): Promise<void> {
    const actor =
      await this.stockMovementsService.requireAuthenticatedActor(actorUserId);

    if (BASE_ALLOWED_ROLES.has(actor.role)) {
      return;
    }

    if (!relevantRoles.includes(actor.role)) {
      throw new ForbiddenException('You are not allowed to access this report');
    }
  }

  private buildDateFilterSql(
    fieldName: string,
    dateRange: ReportDateRange,
    prefix: 'AND' | 'WHERE',
  ): Prisma.Sql {
    if (!dateRange.fromDate && !dateRange.toDate) {
      return Prisma.empty;
    }

    const clauses: Prisma.Sql[] = [];

    if (dateRange.fromDate) {
      clauses.push(
        Prisma.sql`${Prisma.raw(fieldName)} >= ${dateRange.fromDate}`,
      );
    }

    if (dateRange.toDate) {
      clauses.push(Prisma.sql`${Prisma.raw(fieldName)} <= ${dateRange.toDate}`);
    }

    return Prisma.sql`${Prisma.raw(prefix)} ${Prisma.join(clauses, ' AND ')}`;
  }

  private normalizeDateRange(
    dateRange: ReportDateRange,
    defaultWindowDays: number,
  ): Required<ReportDateRange> {
    if (dateRange.fromDate && dateRange.toDate) {
      return {
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
      };
    }

    const toDate = dateRange.toDate ?? new Date();
    const fromDate = dateRange.fromDate
      ? dateRange.fromDate
      : new Date(toDate.getTime() - defaultWindowDays * 24 * 60 * 60 * 1000);

    return { fromDate, toDate };
  }

  private mapSalesPeriodToSqlUnit(
    period: SalesPeriod,
  ): 'day' | 'week' | 'month' {
    switch (period) {
      case 'daily':
        return 'day';
      case 'weekly':
        return 'week';
      case 'monthly':
        return 'month';
      default:
        throw new BadRequestException(
          'period must be one of: daily, weekly, monthly',
        );
    }
  }

  private computeOverallPassRate(rows: QcPassRateRow[]): number {
    const totalPass = rows.reduce((acc, row) => acc + row.pass_count, 0);
    const totalReviewed = rows.reduce(
      (acc, row) => acc + row.pass_count + row.hold_count + row.reject_count,
      0,
    );

    if (totalReviewed === 0) {
      return 0;
    }

    return (totalPass / totalReviewed) * 100;
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
