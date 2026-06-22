import {
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';

type ColumnDef = {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
};

const BASE_ALLOWED_ROLES = new Set<Role>([
  Role.SYSTEM_ADMIN,
  Role.MANAGEMENT_VIEWER,
]);

const CUSTOMER_REPORT_ROLES: Role[] = [
  Role.SALES_EXECUTIVE,
  Role.EXPORT_COORDINATOR,
];

const SUPPLIER_REPORT_ROLES: Role[] = [Role.PROCUREMENT_OFFICER];

const MONEY_FMT = '#,##0.00';
const QTY_FMT = '#,##0.###';
const DATETIME_FMT = 'yyyy-mm-dd hh:mm';

export interface GeneratedWorkbook {
  filename: string;
  buffer: Buffer;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  async exportCustomersWorkbook(
    actorUserId?: string,
  ): Promise<GeneratedWorkbook> {
    try {
      await this.assertRoleAccess(actorUserId, CUSTOMER_REPORT_ROLES);

      const customers = await this.prisma.customer.findMany({
        include: {
          owner: { select: { name: true } },
          salesOrders: {
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
        filename: this.buildFilename('customers-detailed-report'),
        buffer: await this.toBuffer(workbook),
      };
    } catch (error) {
      this.handleError(error, 'Failed to generate customers report');
    }
  }

  async exportSuppliersWorkbook(
    actorUserId?: string,
  ): Promise<GeneratedWorkbook> {
    try {
      await this.assertRoleAccess(actorUserId, SUPPLIER_REPORT_ROLES);

      const suppliers = await this.prisma.supplier.findMany({
        where: { deletedAt: null },
        include: {
          rawMaterials: {
            where: { deletedAt: null },
            include: {
              productionJobs: {
                where: { deletedAt: null },
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
        filename: this.buildFilename('suppliers-detailed-report'),
        buffer: await this.toBuffer(workbook),
      };
    } catch (error) {
      this.handleError(error, 'Failed to generate suppliers report');
    }
  }

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

  private buildFilename(base: string): string {
    const date = new Date().toISOString().slice(0, 10);
    return `${base}-${date}.xlsx`;
  }

  private toDateString(value: Date): string {
    return value.toISOString().slice(0, 10);
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
