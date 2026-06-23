import {
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import type { ReportDateRange } from './reports.routes';

type ColumnDef = {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
};

type SummaryRow = [label: string, value: string | number, numFmt?: string];

const BASE_ALLOWED_ROLES = new Set<Role>([
  Role.SYSTEM_ADMIN,
  Role.MANAGEMENT_VIEWER,
]);

const CUSTOMER_REPORT_ROLES: Role[] = [
  Role.SALES_EXECUTIVE,
  Role.EXPORT_COORDINATOR,
];

const SUPPLIER_REPORT_ROLES: Role[] = [Role.PROCUREMENT_OFFICER];

const SALES_REPORT_ROLES: Role[] = [
  Role.SALES_EXECUTIVE,
  Role.EXPORT_COORDINATOR,
];

// Income & tax are financial reports — restricted to admin / management only.
const FINANCE_REPORT_ROLES: Role[] = [];

const MONEY_FMT = '#,##0.00';
const QTY_FMT = '#,##0.###';
const PCT_FMT = '0.00%';
const DATETIME_FMT = 'yyyy-mm-dd hh:mm';

const DEFAULT_VAT_RATE = 0.18;

type SalesBasis = 'ordered' | 'dispatched';

interface SalesLineRecord {
  customer: string;
  orderId: string;
  channel: string;
  status: string;
  orderDate: Date;
  dispatchDate: Date | null;
  productSku: string;
  productName: string;
  category: string;
  qty: number;
  net: number;
}

interface MoneyTotals {
  net: number;
  vat: number;
  gross: number;
}

interface OrderAggregate {
  customer: string;
  orderId: string;
  channel: string;
  status: string;
  orderDate: Date;
  dispatchDate: Date | null;
  qty: number;
  net: number;
}

export interface GeneratedWorkbook {
  filename: string;
  buffer: Buffer;
}

interface NameValue {
  label: string;
  value: number;
}

export interface FinanceChartData {
  kind: 'sales' | 'income';
  totals: MoneyTotals;
  total_qty: number;
  order_count: number;
  by_channel: NameValue[];
  by_month: Array<{ label: string; net: number; gross: number }>;
  top_products: NameValue[];
}

export interface TaxChartData {
  kind: 'tax';
  rate: number;
  totals: MoneyTotals;
  vat_by_month: NameValue[];
  vat_by_channel: NameValue[];
}

export interface CustomersChartData {
  kind: 'customers';
  totals: {
    customers: number;
    orders: number;
    ordered_value: number;
    dispatched_value: number;
    outstanding_value: number;
  };
  top_customers: NameValue[];
  value_by_type: NameValue[];
}

export interface SuppliersChartData {
  kind: 'suppliers';
  totals: {
    suppliers: number;
    materials: number;
    total_qty: number;
    below_reorder: number;
  };
  top_suppliers: NameValue[];
  qty_by_category: NameValue[];
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  async exportCustomersWorkbook(
    range: ReportDateRange,
    actorUserId?: string,
  ): Promise<GeneratedWorkbook> {
    try {
      await this.assertRoleAccess(actorUserId, CUSTOMER_REPORT_ROLES);

      const orderDateFilter = this.buildDateFilter(range);

      const customers = await this.prisma.customer.findMany({
        include: {
          owner: { select: { name: true } },
          salesOrders: {
            where: orderDateFilter
              ? { orderDate: orderDateFilter }
              : undefined,
            include: {
              orderLines: {
                include: {
                  product: {
                    select: { sku: true, name: true, category: true, unit: true },
                  },
                },
                orderBy: { id: 'asc' },
              },
            },
            orderBy: { orderDate: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });

      const workbook = this.createWorkbook();

      const summarySheet = this.addSheet(workbook, 'Customers', [
        { header: 'Customer', key: 'name', width: 28 },
        { header: 'Type', key: 'type', width: 14 },
        { header: 'Country', key: 'country', width: 16 },
        { header: 'Contact Email', key: 'email', width: 28 },
        { header: 'Contact Phone', key: 'phone', width: 18 },
        { header: 'Address', key: 'address', width: 32 },
        { header: 'Account Owner', key: 'owner', width: 20 },
        { header: 'Total Orders', key: 'orders', width: 13 },
        { header: 'Ordered Value', key: 'orderedValue', width: 16, numFmt: MONEY_FMT },
        { header: 'Dispatched Value', key: 'dispatchedValue', width: 16, numFmt: MONEY_FMT },
        { header: 'Outstanding Value', key: 'outstandingValue', width: 16, numFmt: MONEY_FMT },
        { header: 'First Order', key: 'firstOrder', width: 14 },
        { header: 'Last Order', key: 'lastOrder', width: 14 },
      ]);

      const ordersSheet = this.addSheet(workbook, 'Orders', [
        { header: 'Customer', key: 'customer', width: 28 },
        { header: 'Order Ref', key: 'orderRef', width: 26 },
        { header: 'Channel', key: 'channel', width: 14 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Order Date', key: 'orderDate', width: 18, numFmt: DATETIME_FMT },
        { header: 'Dispatch Date', key: 'dispatchDate', width: 18, numFmt: DATETIME_FMT },
        { header: 'Lines', key: 'lines', width: 8 },
        { header: 'Order Value', key: 'orderValue', width: 16, numFmt: MONEY_FMT },
        { header: 'Dispatched Value', key: 'dispatchedValue', width: 16, numFmt: MONEY_FMT },
      ]);

      const linesSheet = this.addSheet(workbook, 'Order Lines', [
        { header: 'Customer', key: 'customer', width: 28 },
        { header: 'Order Ref', key: 'orderRef', width: 26 },
        { header: 'Product SKU', key: 'sku', width: 18 },
        { header: 'Product', key: 'product', width: 30 },
        { header: 'Category', key: 'category', width: 16 },
        { header: 'Qty Ordered', key: 'qtyOrdered', width: 13, numFmt: QTY_FMT },
        { header: 'Qty Dispatched', key: 'qtyDispatched', width: 14, numFmt: QTY_FMT },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Unit Price', key: 'unitPrice', width: 13, numFmt: MONEY_FMT },
        { header: 'Line Value', key: 'lineValue', width: 14, numFmt: MONEY_FMT },
      ]);

      for (const customer of customers) {
        let orderedValue = 0;
        let dispatchedValue = 0;
        const orderDates: Date[] = [];

        for (const order of customer.salesOrders) {
          orderDates.push(order.orderDate);
          let orderValue = 0;
          let orderDispatchedValue = 0;

          for (const line of order.orderLines) {
            const lineValue = line.qtyOrdered * line.unitPrice;
            const lineDispatched = (line.qtyDispatched ?? 0) * line.unitPrice;
            orderValue += lineValue;
            orderDispatchedValue += lineDispatched;

            linesSheet.addRow({
              customer: customer.name,
              orderRef: order.id,
              sku: line.product.sku,
              product: line.product.name,
              category: line.product.category,
              qtyOrdered: line.qtyOrdered,
              qtyDispatched: line.qtyDispatched ?? 0,
              unit: line.product.unit,
              unitPrice: line.unitPrice,
              lineValue,
            });
          }

          orderedValue += orderValue;
          dispatchedValue += orderDispatchedValue;

          ordersSheet.addRow({
            customer: customer.name,
            orderRef: order.id,
            channel: order.channel ?? '',
            status: order.status,
            orderDate: order.orderDate,
            dispatchDate: order.dispatchDate ?? null,
            lines: order.orderLines.length,
            orderValue,
            dispatchedValue: orderDispatchedValue,
          });
        }

        summarySheet.addRow({
          name: customer.name,
          type: customer.type ?? '',
          country: customer.country ?? '',
          email: customer.contactEmail ?? '',
          phone: customer.contactPhone ?? '',
          address: customer.address ?? '',
          owner: customer.owner?.name ?? '',
          orders: customer.salesOrders.length,
          orderedValue,
          dispatchedValue,
          outstandingValue: orderedValue - dispatchedValue,
          firstOrder: orderDates.length ? this.toDateString(orderDates[0]) : '',
          lastOrder: orderDates.length
            ? this.toDateString(orderDates[orderDates.length - 1])
            : '',
        });
      }

      this.finalizeSheets([summarySheet, ordersSheet, linesSheet]);

      return {
        filename: this.buildFilename('customers-detailed-report', range),
        buffer: await this.toBuffer(workbook),
      };
    } catch (error) {
      this.handleError(error, 'Failed to generate customers report');
    }
  }

  async exportSuppliersWorkbook(
    range: ReportDateRange,
    actorUserId?: string,
  ): Promise<GeneratedWorkbook> {
    try {
      await this.assertRoleAccess(actorUserId, SUPPLIER_REPORT_ROLES);

      const startedFilter = this.buildDateFilter(range);

      const suppliers = await this.prisma.supplier.findMany({
        where: { deletedAt: null },
        include: {
          rawMaterials: {
            where: { deletedAt: null },
            include: {
              productionJobs: {
                where: {
                  deletedAt: null,
                  ...(startedFilter ? { startedAt: startedFilter } : {}),
                },
                orderBy: { startedAt: 'asc' },
              },
            },
            orderBy: [{ materialCategory: 'asc' }, { materialType: 'asc' }],
          },
        },
        orderBy: { name: 'asc' },
      });

      const workbook = this.createWorkbook();

      const summarySheet = this.addSheet(workbook, 'Suppliers', [
        { header: 'Supplier', key: 'name', width: 28 },
        { header: 'Country', key: 'country', width: 16 },
        { header: 'Contact Email', key: 'email', width: 28 },
        { header: 'Certification', key: 'certification', width: 20 },
        { header: 'Materials', key: 'materials', width: 11 },
        { header: 'Total Qty (kg)', key: 'totalQty', width: 15, numFmt: QTY_FMT },
        { header: 'Below Reorder', key: 'belowReorder', width: 14 },
      ]);

      const materialsSheet = this.addSheet(workbook, 'Raw Materials', [
        { header: 'Supplier', key: 'supplier', width: 28 },
        { header: 'Category', key: 'category', width: 16 },
        { header: 'Material Type', key: 'type', width: 22 },
        { header: 'Grade', key: 'grade', width: 14 },
        { header: 'Origin', key: 'origin', width: 16 },
        { header: 'Quantity (kg)', key: 'quantity', width: 14, numFmt: QTY_FMT },
        { header: 'Reorder Level', key: 'reorderLevel', width: 14, numFmt: QTY_FMT },
        { header: 'Shortfall (kg)', key: 'shortfall', width: 14, numFmt: QTY_FMT },
        { header: 'Unit', key: 'unit', width: 10 },
      ]);

      const usageSheet = this.addSheet(workbook, 'Production Usage', [
        { header: 'Supplier', key: 'supplier', width: 28 },
        { header: 'Material Type', key: 'material', width: 22 },
        { header: 'Job ID', key: 'jobId', width: 26 },
        { header: 'Process Type', key: 'processType', width: 16 },
        { header: 'Input (kg)', key: 'input', width: 12, numFmt: QTY_FMT },
        { header: 'Output (kg)', key: 'output', width: 12, numFmt: QTY_FMT },
        { header: 'Yield %', key: 'yield', width: 10, numFmt: '#,##0.0' },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'QC Status', key: 'qcStatus', width: 12 },
        { header: 'Started', key: 'startedAt', width: 18, numFmt: DATETIME_FMT },
        { header: 'Completed', key: 'completedAt', width: 18, numFmt: DATETIME_FMT },
      ]);

      for (const supplier of suppliers) {
        let totalQty = 0;
        let belowReorder = 0;

        for (const material of supplier.rawMaterials) {
          totalQty += material.quantityKg;
          const shortfall = Math.max(
            material.reorderLevel - material.quantityKg,
            0,
          );
          if (material.quantityKg < material.reorderLevel) {
            belowReorder += 1;
          }

          materialsSheet.addRow({
            supplier: supplier.name,
            category: material.materialCategory,
            type: material.materialType,
            grade: material.grade ?? '',
            origin: material.origin ?? '',
            quantity: material.quantityKg,
            reorderLevel: material.reorderLevel,
            shortfall,
            unit: material.unit,
          });

          for (const job of material.productionJobs) {
            const yieldPct =
              job.outputQtyKg != null && job.inputQtyKg > 0
                ? (job.outputQtyKg / job.inputQtyKg) * 100
                : null;

            usageSheet.addRow({
              supplier: supplier.name,
              material: material.materialType,
              jobId: job.id,
              processType: job.processType,
              input: job.inputQtyKg,
              output: job.outputQtyKg ?? null,
              yield: yieldPct,
              status: job.status,
              qcStatus: job.qcStatus,
              startedAt: job.startedAt ?? null,
              completedAt: job.completedAt ?? null,
            });
          }
        }

        summarySheet.addRow({
          name: supplier.name,
          country: supplier.country ?? '',
          email: supplier.contactEmail ?? '',
          certification: supplier.certification ?? '',
          materials: supplier.rawMaterials.length,
          totalQty,
          belowReorder,
        });
      }

      this.finalizeSheets([summarySheet, materialsSheet, usageSheet]);

      return {
        filename: this.buildFilename('suppliers-detailed-report', range),
        buffer: await this.toBuffer(workbook),
      };
    } catch (error) {
      this.handleError(error, 'Failed to generate suppliers report');
    }
  }

  async exportSalesWorkbook(
    range: ReportDateRange,
    actorUserId?: string,
  ): Promise<GeneratedWorkbook> {
    try {
      await this.assertRoleAccess(actorUserId, SALES_REPORT_ROLES);

      const records = await this.collectSalesLines('ordered', range);
      const workbook = this.buildFinanceWorkbook({
        records,
        dateBasis: 'order',
        qtyLabel: 'Qty Ordered',
        valueLabel: 'Sales',
        summaryTitle: 'Sales Report (booked by order date)',
        range,
      });

      return {
        filename: this.buildFilename('sales-report', range),
        buffer: await this.toBuffer(workbook),
      };
    } catch (error) {
      this.handleError(error, 'Failed to generate sales report');
    }
  }

  async exportIncomeWorkbook(
    range: ReportDateRange,
    actorUserId?: string,
  ): Promise<GeneratedWorkbook> {
    try {
      await this.assertRoleAccess(actorUserId, FINANCE_REPORT_ROLES);

      const records = await this.collectSalesLines('dispatched', range);
      const workbook = this.buildFinanceWorkbook({
        records,
        dateBasis: 'dispatch',
        qtyLabel: 'Units Dispatched',
        valueLabel: 'Income',
        summaryTitle: 'Income Report (realized on dispatch)',
        range,
      });

      return {
        filename: this.buildFilename('income-report', range),
        buffer: await this.toBuffer(workbook),
      };
    } catch (error) {
      this.handleError(error, 'Failed to generate income report');
    }
  }

  async exportTaxWorkbook(
    range: ReportDateRange,
    actorUserId?: string,
  ): Promise<GeneratedWorkbook> {
    try {
      await this.assertRoleAccess(actorUserId, FINANCE_REPORT_ROLES);

      const records = await this.collectSalesLines('dispatched', range);
      const rate = this.vatRate;
      const totals = this.sumTotals(records);

      const workbook = this.createWorkbook();

      this.addSummarySheet(workbook, 'Summary', [
        ['Tax / VAT Report (output VAT on dispatched sales)', ''],
        ['Period', this.periodLabel(range)],
        ['VAT Rate', rate, PCT_FMT],
        ['Generated', this.toDateString(new Date())],
        ['', ''],
        ['Taxable Net Amount', totals.net, MONEY_FMT],
        ['Output VAT', totals.vat, MONEY_FMT],
        ['Gross (incl. VAT)', totals.gross, MONEY_FMT],
      ]);

      // VAT grouped by month — convenient for filing periods.
      const monthSheet = this.addSheet(workbook, 'VAT by Month', [
        { header: 'Month', key: 'month', width: 14 },
        { header: 'Net', key: 'net', width: 16, numFmt: MONEY_FMT },
        { header: 'VAT', key: 'vat', width: 16, numFmt: MONEY_FMT },
        { header: 'Gross', key: 'gross', width: 16, numFmt: MONEY_FMT },
      ]);

      for (const row of this.groupByMonth(records, 'dispatch')) {
        monthSheet.addRow({
          month: row.month,
          net: row.net,
          vat: row.vat,
          gross: row.gross,
        });
      }

      // Per-order VAT detail.
      const detailSheet = this.addSheet(workbook, 'VAT Detail', [
        { header: 'Customer', key: 'customer', width: 28 },
        { header: 'Order Ref', key: 'orderRef', width: 26 },
        { header: 'Channel', key: 'channel', width: 14 },
        { header: 'Dispatch Date', key: 'dispatchDate', width: 18, numFmt: DATETIME_FMT },
        { header: 'Net (Taxable)', key: 'net', width: 16, numFmt: MONEY_FMT },
        { header: 'VAT Rate', key: 'rate', width: 10, numFmt: PCT_FMT },
        { header: 'VAT Amount', key: 'vat', width: 16, numFmt: MONEY_FMT },
        { header: 'Gross', key: 'gross', width: 16, numFmt: MONEY_FMT },
      ]);

      const byOrder = this.aggregateByOrder(records);
      for (const order of byOrder) {
        const breakdown = this.taxBreakdown(order.net);
        detailSheet.addRow({
          customer: order.customer,
          orderRef: order.orderId,
          channel: order.channel,
          dispatchDate: order.dispatchDate,
          net: breakdown.net,
          rate,
          vat: breakdown.vat,
          gross: breakdown.gross,
        });
      }

      this.finalizeSheets([monthSheet, detailSheet]);

      return {
        filename: this.buildFilename('tax-report', range),
        buffer: await this.toBuffer(workbook),
      };
    } catch (error) {
      this.handleError(error, 'Failed to generate tax report');
    }
  }

  // --- chart data (JSON for in-app graphs) ---

  async getSalesChartData(
    range: ReportDateRange,
    actorUserId?: string,
  ): Promise<FinanceChartData> {
    await this.assertRoleAccess(actorUserId, SALES_REPORT_ROLES);
    const records = await this.collectSalesLines('ordered', range);
    return this.buildFinanceChartData('sales', records, 'order');
  }

  async getIncomeChartData(
    range: ReportDateRange,
    actorUserId?: string,
  ): Promise<FinanceChartData> {
    await this.assertRoleAccess(actorUserId, FINANCE_REPORT_ROLES);
    const records = await this.collectSalesLines('dispatched', range);
    return this.buildFinanceChartData('income', records, 'dispatch');
  }

  async getTaxChartData(
    range: ReportDateRange,
    actorUserId?: string,
  ): Promise<TaxChartData> {
    await this.assertRoleAccess(actorUserId, FINANCE_REPORT_ROLES);
    const records = await this.collectSalesLines('dispatched', range);

    return {
      kind: 'tax',
      rate: this.vatRate,
      totals: this.sumTotals(records),
      vat_by_month: this.groupByMonth(records, 'dispatch').map((row) => ({
        label: row.month,
        value: row.vat,
      })),
      vat_by_channel: this.groupByChannel(records).map((row) => ({
        label: row.channel,
        value: row.vat,
      })),
    };
  }

  async getCustomersChartData(
    range: ReportDateRange,
    actorUserId?: string,
  ): Promise<CustomersChartData> {
    await this.assertRoleAccess(actorUserId, CUSTOMER_REPORT_ROLES);

    const orderDateFilter = this.buildDateFilter(range);
    const customers = await this.prisma.customer.findMany({
      include: {
        salesOrders: {
          where: orderDateFilter ? { orderDate: orderDateFilter } : undefined,
          include: { orderLines: true },
        },
      },
    });

    let ordersCount = 0;
    let orderedTotal = 0;
    let dispatchedTotal = 0;
    const perCustomer: NameValue[] = [];
    const typeMap = new Map<string, number>();

    for (const customer of customers) {
      let ordered = 0;
      let dispatched = 0;

      for (const order of customer.salesOrders) {
        ordersCount += 1;
        for (const line of order.orderLines) {
          ordered += line.qtyOrdered * line.unitPrice;
          dispatched += (line.qtyDispatched ?? 0) * line.unitPrice;
        }
      }

      orderedTotal += ordered;
      dispatchedTotal += dispatched;
      perCustomer.push({ label: customer.name, value: ordered });

      const type = customer.type?.trim() || 'Unspecified';
      typeMap.set(type, (typeMap.get(type) ?? 0) + ordered);
    }

    return {
      kind: 'customers',
      totals: {
        customers: customers.length,
        orders: ordersCount,
        ordered_value: orderedTotal,
        dispatched_value: dispatchedTotal,
        outstanding_value: orderedTotal - dispatchedTotal,
      },
      top_customers: perCustomer
        .filter((row) => row.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
      value_by_type: [...typeMap.entries()]
        .map(([label, value]) => ({ label, value }))
        .filter((row) => row.value > 0)
        .sort((a, b) => b.value - a.value),
    };
  }

  async getSuppliersChartData(
    range: ReportDateRange,
    actorUserId?: string,
  ): Promise<SuppliersChartData> {
    await this.assertRoleAccess(actorUserId, SUPPLIER_REPORT_ROLES);

    const suppliers = await this.prisma.supplier.findMany({
      where: { deletedAt: null },
      include: {
        rawMaterials: { where: { deletedAt: null } },
      },
    });

    let materialsCount = 0;
    let totalQty = 0;
    let belowReorder = 0;
    const perSupplier: NameValue[] = [];
    const categoryMap = new Map<string, number>();

    for (const supplier of suppliers) {
      let supplierQty = 0;

      for (const material of supplier.rawMaterials) {
        materialsCount += 1;
        supplierQty += material.quantityKg;
        totalQty += material.quantityKg;
        if (material.quantityKg < material.reorderLevel) {
          belowReorder += 1;
        }
        categoryMap.set(
          material.materialCategory,
          (categoryMap.get(material.materialCategory) ?? 0) +
            material.quantityKg,
        );
      }

      perSupplier.push({ label: supplier.name, value: supplierQty });
    }

    return {
      kind: 'suppliers',
      totals: {
        suppliers: suppliers.length,
        materials: materialsCount,
        total_qty: totalQty,
        below_reorder: belowReorder,
      },
      top_suppliers: perSupplier
        .filter((row) => row.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
      qty_by_category: [...categoryMap.entries()]
        .map(([label, value]) => ({ label, value }))
        .filter((row) => row.value > 0)
        .sort((a, b) => b.value - a.value),
    };
  }

  private buildFinanceChartData(
    kind: 'sales' | 'income',
    records: SalesLineRecord[],
    dateBasis: 'order' | 'dispatch',
  ): FinanceChartData {
    return {
      kind,
      totals: this.sumTotals(records),
      total_qty: records.reduce((acc, record) => acc + record.qty, 0),
      order_count: new Set(records.map((record) => record.orderId)).size,
      by_channel: this.groupByChannel(records).map((row) => ({
        label: row.channel,
        value: row.net,
      })),
      by_month: this.groupByMonth(records, dateBasis).map((row) => ({
        label: row.month,
        net: row.net,
        gross: row.gross,
      })),
      top_products: this.groupByProduct(records)
        .slice(0, 10)
        .map((row) => ({ label: row.name, value: row.net })),
    };
  }

  // --- finance helpers ---

  private async collectSalesLines(
    basis: SalesBasis,
    range: ReportDateRange,
  ): Promise<SalesLineRecord[]> {
    const dateFilter = this.buildDateFilter(range);

    const where: Prisma.SalesOrderWhereInput =
      basis === 'dispatched'
        ? { dispatchDate: { not: null, ...(dateFilter ?? {}) } }
        : dateFilter
          ? { orderDate: dateFilter }
          : {};

    const orders = await this.prisma.salesOrder.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        orderLines: {
          include: {
            product: { select: { sku: true, name: true, category: true } },
          },
        },
      },
      orderBy: basis === 'dispatched' ? { dispatchDate: 'asc' } : { orderDate: 'asc' },
    });

    const records: SalesLineRecord[] = [];

    for (const order of orders) {
      for (const line of order.orderLines) {
        const qty =
          basis === 'dispatched' ? line.qtyDispatched ?? 0 : line.qtyOrdered;

        if (qty <= 0) {
          continue;
        }

        records.push({
          customer: order.customer.name,
          orderId: order.id,
          channel: order.channel ?? 'unspecified',
          status: order.status,
          orderDate: order.orderDate,
          dispatchDate: order.dispatchDate ?? null,
          productSku: line.product.sku,
          productName: line.product.name,
          category: line.product.category,
          qty,
          net: qty * line.unitPrice,
        });
      }
    }

    return records;
  }

  private buildFinanceWorkbook(params: {
    records: SalesLineRecord[];
    dateBasis: 'order' | 'dispatch';
    qtyLabel: string;
    valueLabel: string;
    summaryTitle: string;
    range: ReportDateRange;
  }): ExcelJS.Workbook {
    const { records, dateBasis, qtyLabel, valueLabel, summaryTitle, range } =
      params;
    const rate = this.vatRate;
    const totals = this.sumTotals(records);
    const totalQty = records.reduce((acc, record) => acc + record.qty, 0);
    const orderCount = new Set(records.map((record) => record.orderId)).size;

    const workbook = this.createWorkbook();

    this.addSummarySheet(workbook, 'Summary', [
      [summaryTitle, ''],
      ['Period', this.periodLabel(range)],
      ['VAT Rate', rate, PCT_FMT],
      ['Generated', this.toDateString(new Date())],
      ['', ''],
      ['Orders', orderCount],
      [qtyLabel, totalQty, QTY_FMT],
      [`Net ${valueLabel}`, totals.net, MONEY_FMT],
      ['VAT', totals.vat, MONEY_FMT],
      ['Gross (incl. VAT)', totals.gross, MONEY_FMT],
    ]);

    // By channel
    const channelSheet = this.addSheet(workbook, 'By Channel', [
      { header: 'Channel', key: 'channel', width: 18 },
      { header: 'Orders', key: 'orders', width: 10 },
      { header: qtyLabel, key: 'qty', width: 16, numFmt: QTY_FMT },
      { header: 'Net', key: 'net', width: 16, numFmt: MONEY_FMT },
      { header: 'VAT', key: 'vat', width: 16, numFmt: MONEY_FMT },
      { header: 'Gross', key: 'gross', width: 16, numFmt: MONEY_FMT },
    ]);

    for (const row of this.groupByChannel(records)) {
      channelSheet.addRow({
        channel: row.channel,
        orders: row.orders,
        qty: row.qty,
        net: row.net,
        vat: row.vat,
        gross: row.gross,
      });
    }

    // By order
    const orderSheet = this.addSheet(workbook, 'By Order', [
      { header: 'Customer', key: 'customer', width: 28 },
      { header: 'Order Ref', key: 'orderRef', width: 26 },
      { header: 'Channel', key: 'channel', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      {
        header: dateBasis === 'dispatch' ? 'Dispatch Date' : 'Order Date',
        key: 'date',
        width: 18,
        numFmt: DATETIME_FMT,
      },
      { header: qtyLabel, key: 'qty', width: 16, numFmt: QTY_FMT },
      { header: 'Net', key: 'net', width: 16, numFmt: MONEY_FMT },
      { header: 'VAT', key: 'vat', width: 16, numFmt: MONEY_FMT },
      { header: 'Gross', key: 'gross', width: 16, numFmt: MONEY_FMT },
    ]);

    for (const order of this.aggregateByOrder(records)) {
      const breakdown = this.taxBreakdown(order.net);
      orderSheet.addRow({
        customer: order.customer,
        orderRef: order.orderId,
        channel: order.channel,
        status: order.status,
        date: dateBasis === 'dispatch' ? order.dispatchDate : order.orderDate,
        qty: order.qty,
        ...breakdown,
      });
    }

    // By product
    const productSheet = this.addSheet(workbook, 'By Product', [
      { header: 'Product SKU', key: 'sku', width: 18 },
      { header: 'Product', key: 'product', width: 30 },
      { header: 'Category', key: 'category', width: 16 },
      { header: qtyLabel, key: 'qty', width: 16, numFmt: QTY_FMT },
      { header: 'Net', key: 'net', width: 16, numFmt: MONEY_FMT },
      { header: 'VAT', key: 'vat', width: 16, numFmt: MONEY_FMT },
      { header: 'Gross', key: 'gross', width: 16, numFmt: MONEY_FMT },
    ]);

    for (const row of this.groupByProduct(records)) {
      productSheet.addRow({
        sku: row.sku,
        product: row.name,
        category: row.category,
        qty: row.qty,
        net: row.net,
        vat: row.vat,
        gross: row.gross,
      });
    }

    this.finalizeSheets([channelSheet, orderSheet, productSheet]);

    return workbook;
  }

  private aggregateByOrder(records: SalesLineRecord[]): OrderAggregate[] {
    const map = new Map<string, OrderAggregate>();

    for (const record of records) {
      const existing = map.get(record.orderId);
      if (existing) {
        existing.qty += record.qty;
        existing.net += record.net;
      } else {
        map.set(record.orderId, {
          customer: record.customer,
          orderId: record.orderId,
          channel: record.channel,
          status: record.status,
          orderDate: record.orderDate,
          dispatchDate: record.dispatchDate,
          qty: record.qty,
          net: record.net,
        });
      }
    }

    return [...map.values()];
  }

  private groupByChannel(
    records: SalesLineRecord[],
  ): Array<{ channel: string; orders: number; qty: number } & MoneyTotals> {
    const map = new Map<
      string,
      { orders: Set<string>; qty: number; net: number }
    >();

    for (const record of records) {
      const current = map.get(record.channel) ?? {
        orders: new Set<string>(),
        qty: 0,
        net: 0,
      };
      current.orders.add(record.orderId);
      current.qty += record.qty;
      current.net += record.net;
      map.set(record.channel, current);
    }

    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([channel, value]) => ({
        channel,
        orders: value.orders.size,
        qty: value.qty,
        ...this.taxBreakdown(value.net),
      }));
  }

  private groupByProduct(
    records: SalesLineRecord[],
  ): Array<
    { sku: string; name: string; category: string; qty: number } & MoneyTotals
  > {
    const map = new Map<
      string,
      { name: string; category: string; qty: number; net: number }
    >();

    for (const record of records) {
      const current = map.get(record.productSku) ?? {
        name: record.productName,
        category: record.category,
        qty: 0,
        net: 0,
      };
      current.qty += record.qty;
      current.net += record.net;
      map.set(record.productSku, current);
    }

    return [...map.entries()]
      .map(([sku, value]) => ({
        sku,
        name: value.name,
        category: value.category,
        qty: value.qty,
        ...this.taxBreakdown(value.net),
      }))
      .sort((a, b) => b.net - a.net);
  }

  private groupByMonth(
    records: SalesLineRecord[],
    dateBasis: 'order' | 'dispatch',
  ): Array<{ month: string } & MoneyTotals> {
    const map = new Map<string, number>();

    for (const record of records) {
      const date =
        dateBasis === 'dispatch'
          ? record.dispatchDate ?? record.orderDate
          : record.orderDate;
      const key = this.monthKey(date);
      map.set(key, (map.get(key) ?? 0) + record.net);
    }

    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, net]) => ({ month, ...this.taxBreakdown(net) }));
  }

  private sumTotals(records: SalesLineRecord[]): MoneyTotals {
    const net = records.reduce((acc, record) => acc + record.net, 0);
    return this.taxBreakdown(net);
  }

  private taxBreakdown(net: number): MoneyTotals {
    const vat = net * this.vatRate;
    return { net, vat, gross: net + vat };
  }

  private get vatRate(): number {
    const raw = Number(process.env.VAT_RATE);

    if (!Number.isFinite(raw) || raw < 0) {
      return DEFAULT_VAT_RATE;
    }

    // Accept either a fraction (0.18) or a percentage (18).
    return raw > 1 ? raw / 100 : raw;
  }

  // --- workbook helpers ---

  private createWorkbook(): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Alumex Inventory Management System';
    workbook.created = new Date();
    return workbook;
  }

  private addSheet(
    workbook: ExcelJS.Workbook,
    name: string,
    columns: ColumnDef[],
  ): ExcelJS.Worksheet {
    const sheet = workbook.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width ?? 16,
      style: column.numFmt ? { numFmt: column.numFmt } : undefined,
    }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' },
    };
    headerRow.alignment = { vertical: 'middle' };

    return sheet;
  }

  private addSummarySheet(
    workbook: ExcelJS.Workbook,
    name: string,
    rows: SummaryRow[],
  ): ExcelJS.Worksheet {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = [
      { key: 'label', width: 30 },
      { key: 'value', width: 24 },
    ];

    rows.forEach(([label, value, numFmt], index) => {
      const row = sheet.addRow({ label, value });
      // First row is the report title.
      if (index === 0) {
        row.getCell('label').font = { bold: true, size: 13 };
      } else {
        row.getCell('label').font = { bold: true };
      }
      if (numFmt) {
        row.getCell('value').numFmt = numFmt;
      }
    });

    return sheet;
  }

  private finalizeSheets(sheets: ExcelJS.Worksheet[]): void {
    for (const sheet of sheets) {
      if (sheet.columnCount > 0 && sheet.rowCount > 0) {
        sheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: sheet.columnCount },
        };
      }
    }
  }

  private async toBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data as ArrayBuffer);
  }

  // --- date helpers ---

  private buildDateFilter(
    range: ReportDateRange,
  ): Prisma.DateTimeFilter | undefined {
    if (!range.fromDate && !range.toDate) {
      return undefined;
    }

    return {
      ...(range.fromDate ? { gte: range.fromDate } : {}),
      ...(range.toDate ? { lte: range.toDate } : {}),
    };
  }

  private buildFilename(base: string, range: ReportDateRange): string {
    if (range.fromDate && range.toDate) {
      return `${base}-${this.toDateString(range.fromDate)}-to-${this.toDateString(range.toDate)}.xlsx`;
    }

    if (range.fromDate) {
      return `${base}-from-${this.toDateString(range.fromDate)}.xlsx`;
    }

    if (range.toDate) {
      return `${base}-to-${this.toDateString(range.toDate)}.xlsx`;
    }

    return `${base}-all-${this.toDateString(new Date())}.xlsx`;
  }

  private periodLabel(range: ReportDateRange): string {
    const from = range.fromDate ? this.toDateString(range.fromDate) : 'Earliest';
    const to = range.toDate ? this.toDateString(range.toDate) : 'Latest';
    return `${from} → ${to}`;
  }

  private toDateString(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private monthKey(value: Date): string {
    return value.toISOString().slice(0, 7);
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

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
