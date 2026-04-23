import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Customer, Prisma, Role, SalesOrder } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import {
  ORDER_STATUSES,
  SALES_CHANNELS,
  type OrderStatus,
  type SalesChannel,
  type SalesOrderListFilters,
} from './sales-orders.routes';

const ORDER_STATUS_SET = new Set<string>(ORDER_STATUSES);
const SALES_CHANNEL_SET = new Set<string>(SALES_CHANNELS);
const DISPATCH_ALLOWED_ROLES = new Set<Role>([
  Role.WAREHOUSE_OFFICER,
  Role.EXPORT_COORDINATOR,
  Role.SYSTEM_ADMIN,
]);

export interface CreateOrderLineDto {
  productId: string;
  qtyOrdered: number;
  unitPrice: number;
}

export interface CreateSalesOrderDto {
  customerId: string;
  channel?: SalesChannel;
  orderDate?: string | Date;
  lines: CreateOrderLineDto[];
}

export interface AddOrderLineDto extends CreateOrderLineDto {}

export interface UpdateOrderLineDto {
  quantity: number;
}

export interface ReturnOrderDto {
  reason?: string;
}

export interface SalesOrderListItem extends SalesOrder {
  customer: {
    id: string;
    name: string;
    country: string | null;
    type: string | null;
  };
  lineCount: number;
  dispatchStatus: string;
}

export interface OrderLineDetails {
  id: string;
  orderId: string;
  productId: string;
  qtyOrdered: number;
  qtyDispatched: number;
  unitPrice: number;
  reservedQuantity: number;
  dispatchStatus: string;
  product: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  };
}

export interface SalesOrderDetails extends SalesOrder {
  customer: Customer;
  orderLines: OrderLineDetails[];
  dispatchStatus: string;
}

interface ReservationRow {
  id: string;
  itemId: string;
  quantity: number;
}

type DbClient = Prisma.TransactionClient | PrismaService;

type SalesOrderWithRelations = Prisma.SalesOrderGetPayload<{
  include: {
    customer: true;
    orderLines: {
      include: {
        product: {
          select: {
            id: true;
            sku: true;
            name: true;
            unit: true;
          };
        };
        reservations: true;
      };
      orderBy: {
        id: 'asc';
      };
    };
  };
}>;

@Injectable()
export class SalesOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  async listOrders(filters: SalesOrderListFilters): Promise<SalesOrderListItem[]> {
    try {
      const where: Prisma.SalesOrderWhereInput = {};

      if (filters.status) {
        this.validateOrderStatus(filters.status);
        where.status = {
          equals: filters.status,
          mode: 'insensitive',
        };
      }

      if (filters.channel) {
        this.validateChannel(filters.channel);
        where.channel = {
          equals: filters.channel,
          mode: 'insensitive',
        };
      }

      if (filters.customerId) {
        where.customerId = filters.customerId;
      }

      if (filters.startDate || filters.endDate) {
        where.orderDate = {};

        if (filters.startDate) {
          where.orderDate.gte = filters.startDate;
        }

        if (filters.endDate) {
          where.orderDate.lte = filters.endDate;
        }
      }

      const orders = await this.prisma.salesOrder.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              country: true,
              type: true,
            },
          },
          _count: {
            select: {
              orderLines: true,
            },
          },
        },
        orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
      });

      return orders.map((order) => ({
        ...order,
        lineCount: order._count.orderLines,
        dispatchStatus: this.mapOrderDispatchStatus(order.status),
      }));
    } catch (error) {
      this.handleError(error, 'Failed to list sales orders');
    }
  }

  async getOrderById(id: string): Promise<SalesOrderDetails> {
    try {
      const order = await this.getOrderWithRelations(this.prisma, id);
      return this.toOrderDetails(order);
    } catch (error) {
      this.handleError(error, 'Failed to get sales order');
    }
  }

  async createOrder(body: CreateSalesOrderDto): Promise<SalesOrderDetails> {
    try {
      this.validateCreateOrderPayload(body);

      return await this.prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findUnique({
          where: { id: body.customerId },
        });

        if (!customer) {
          throw new NotFoundException(
            `Customer with id ${body.customerId} was not found`,
          );
        }

        const channel = body.channel ?? 'local';
        this.assertExportCustomerCountry(channel, customer);

        const order = await tx.salesOrder.create({
          data: {
            customerId: body.customerId,
            channel,
            status: 'pending',
            orderDate: this.parseOptionalDate(body.orderDate) ?? new Date(),
          },
        });

        for (const lineInput of body.lines) {
          const line = await tx.orderLine.create({
            data: {
              orderId: order.id,
              productId: lineInput.productId,
              qtyOrdered: lineInput.qtyOrdered,
              qtyDispatched: 0,
              unitPrice: lineInput.unitPrice,
            },
          });

          await this.reserveInventoryForLine(
            tx,
            line.id,
            lineInput.productId,
            lineInput.qtyOrdered,
          );
        }

        const fullOrder = await this.getOrderWithRelations(tx, order.id);
        return this.toOrderDetails(fullOrder);
      });
    } catch (error) {
      this.handleError(error, 'Failed to create sales order');
    }
  }

  async dispatchOrder(
    id: string,
    actorUserId?: string,
  ): Promise<SalesOrderDetails> {
    try {
      const actor =
        await this.stockMovementsService.requireAuthenticatedActor(actorUserId);

      if (!DISPATCH_ALLOWED_ROLES.has(actor.role)) {
        throw new ForbiddenException(
          'Only warehouse_officer, export_coordinator, or system_admin can dispatch orders',
        );
      }

      return await this.prisma.$transaction(async (tx) => {
        const order = await this.getOrderWithRelations(tx, id);

        this.assertOrderStatus(order.status, 'pending', 'Only pending orders can be dispatched');

        if (order.orderLines.length === 0) {
          throw new BadRequestException('Order has no lines to dispatch');
        }

        for (const line of order.orderLines) {
          if (line.reservations.length === 0) {
            throw new BadRequestException(
              `Order line ${line.id} has no reserved inventory to dispatch`,
            );
          }

          for (const reservation of line.reservations) {
            const updateResult = await tx.inventoryItem.updateMany({
              where: {
                id: reservation.itemId,
                quantity: {
                  gte: reservation.quantity,
                },
                reservedQuantity: {
                  gte: reservation.quantity,
                },
              },
              data: {
                quantity: {
                  decrement: reservation.quantity,
                },
                reservedQuantity: {
                  decrement: reservation.quantity,
                },
              },
            });

            if (updateResult.count === 0) {
              throw new ConflictException(
                `Dispatch failed due to concurrent inventory changes for item ${reservation.itemId}`,
              );
            }

            await this.stockMovementsService.createMovementWithinTx(tx, {
              itemId: reservation.itemId,
              movementType: 'DISPATCH',
              quantity: -reservation.quantity,
              performedBy: actor.id,
              reason: `Order ${order.id} dispatched`,
            });
          }

          await tx.orderLine.update({
            where: { id: line.id },
            data: {
              qtyDispatched: line.qtyOrdered,
            },
          });
        }

        await tx.salesOrder.update({
          where: { id: order.id },
          data: {
            status: 'dispatched',
            dispatchDate: new Date(),
          },
        });

        const fullOrder = await this.getOrderWithRelations(tx, id);
        return this.toOrderDetails(fullOrder);
      });
    } catch (error) {
      this.handleError(error, 'Failed to dispatch sales order');
    }
  }

  async cancelOrder(id: string): Promise<SalesOrderDetails> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const order = await this.getOrderWithRelations(tx, id);

        this.assertOrderStatus(order.status, 'pending', 'Only pending orders can be cancelled');

        for (const line of order.orderLines) {
          await this.releaseReservationsForLine(tx, line.id);
        }

        await tx.salesOrder.update({
          where: { id: order.id },
          data: {
            status: 'cancelled',
            dispatchDate: null,
          },
        });

        const fullOrder = await this.getOrderWithRelations(tx, id);
        return this.toOrderDetails(fullOrder);
      });
    } catch (error) {
      this.handleError(error, 'Failed to cancel sales order');
    }
  }

  async returnOrder(
    id: string,
    body: ReturnOrderDto,
    actorUserId?: string,
  ): Promise<SalesOrderDetails> {
    try {
      const actor =
        await this.stockMovementsService.requireAuthenticatedActor(actorUserId);

      return await this.prisma.$transaction(async (tx) => {
        const order = await this.getOrderWithRelations(tx, id);

        this.assertOrderStatus(order.status, 'dispatched', 'Only dispatched orders can be returned');

        for (const line of order.orderLines) {
          if (line.reservations.length === 0) {
            throw new BadRequestException(
              `Order line ${line.id} has no dispatch allocation for return`,
            );
          }

          for (const reservation of line.reservations) {
            await tx.inventoryItem.update({
              where: { id: reservation.itemId },
              data: {
                quantity: {
                  increment: reservation.quantity,
                },
              },
            });

            await this.stockMovementsService.createMovementWithinTx(tx, {
              itemId: reservation.itemId,
              movementType: 'RETURN',
              quantity: reservation.quantity,
              performedBy: actor.id,
              reason:
                body.reason?.trim() || `Order ${order.id} returned to inventory`,
            });
          }

          await tx.orderLine.update({
            where: { id: line.id },
            data: {
              qtyDispatched: 0,
            },
          });
        }

        await tx.salesOrder.update({
          where: { id: order.id },
          data: {
            status: 'returned',
          },
        });

        const fullOrder = await this.getOrderWithRelations(tx, id);
        return this.toOrderDetails(fullOrder);
      });
    } catch (error) {
      this.handleError(error, 'Failed to return sales order');
    }
  }

  async addOrderLine(
    orderId: string,
    body: AddOrderLineDto,
  ): Promise<OrderLineDetails> {
    try {
      this.validateOrderLinePayload(body);

      return await this.prisma.$transaction(async (tx) => {
        const order = await tx.salesOrder.findUnique({
          where: { id: orderId },
          include: {
            customer: true,
          },
        });

        if (!order) {
          throw new NotFoundException(`Sales order with id ${orderId} was not found`);
        }

        this.assertOrderStatus(order.status, 'pending', 'Lines can only be added to pending orders');
        this.assertExportCustomerCountry(order.channel ?? 'local', order.customer);

        const line = await tx.orderLine.create({
          data: {
            orderId,
            productId: body.productId,
            qtyOrdered: body.qtyOrdered,
            qtyDispatched: 0,
            unitPrice: body.unitPrice,
          },
        });

        await this.reserveInventoryForLine(tx, line.id, body.productId, body.qtyOrdered);

        return await this.getOrderLineDetails(tx, line.id);
      });
    } catch (error) {
      this.handleError(error, 'Failed to add order line');
    }
  }

  async updateOrderLine(
    id: string,
    body: UpdateOrderLineDto,
  ): Promise<OrderLineDetails> {
    try {
      this.validateOrderLineUpdatePayload(body);

      return await this.prisma.$transaction(async (tx) => {
        const line = await tx.orderLine.findUnique({
          where: { id },
          include: {
            order: true,
          },
        });

        if (!line) {
          throw new NotFoundException(`Order line with id ${id} was not found`);
        }

        this.assertOrderStatus(
          line.order.status,
          'pending',
          'Only lines in pending orders can be updated',
        );

        if (body.quantity > line.qtyOrdered) {
          const extraToReserve = body.quantity - line.qtyOrdered;
          await this.reserveInventoryForLine(
            tx,
            line.id,
            line.productId,
            extraToReserve,
          );
        } else if (body.quantity < line.qtyOrdered) {
          const quantityToRelease = line.qtyOrdered - body.quantity;
          await this.releaseReservationQuantity(tx, line.id, quantityToRelease);
        }

        await tx.orderLine.update({
          where: { id },
          data: {
            qtyOrdered: body.quantity,
          },
        });

        return await this.getOrderLineDetails(tx, id);
      });
    } catch (error) {
      this.handleError(error, 'Failed to update order line');
    }
  }

  async deleteOrderLine(
    id: string,
  ): Promise<{ id: string; orderId: string; releasedQuantity: number }> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const line = await tx.orderLine.findUnique({
          where: { id },
          include: {
            order: true,
            reservations: true,
          },
        });

        if (!line) {
          throw new NotFoundException(`Order line with id ${id} was not found`);
        }

        this.assertOrderStatus(
          line.order.status,
          'pending',
          'Only lines in pending orders can be removed',
        );

        const releasedQuantity = line.reservations.reduce(
          (sum, reservation) => sum + reservation.quantity,
          0,
        );

        await this.releaseReservationsForLine(tx, line.id);

        await tx.orderLine.delete({
          where: { id },
        });

        return {
          id,
          orderId: line.orderId,
          releasedQuantity,
        };
      });
    } catch (error) {
      this.handleError(error, 'Failed to delete order line');
    }
  }

  private async getOrderWithRelations(
    client: DbClient,
    id: string,
  ): Promise<SalesOrderWithRelations> {
    const order = await client.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        orderLines: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
              },
            },
            reservations: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Sales order with id ${id} was not found`);
    }

    return order;
  }

  private toOrderDetails(order: SalesOrderWithRelations): SalesOrderDetails {
    return {
      ...order,
      dispatchStatus: this.mapOrderDispatchStatus(order.status),
      orderLines: order.orderLines.map((line) => {
        const reservedQuantity = line.reservations.reduce(
          (sum, reservation) => sum + reservation.quantity,
          0,
        );

        return {
          id: line.id,
          orderId: line.orderId,
          productId: line.productId,
          qtyOrdered: line.qtyOrdered,
          qtyDispatched: line.qtyDispatched ?? 0,
          unitPrice: line.unitPrice,
          reservedQuantity,
          dispatchStatus: this.mapLineDispatchStatus(
            order.status,
            line.qtyOrdered,
            line.qtyDispatched ?? 0,
            reservedQuantity,
          ),
          product: line.product,
        };
      }),
    };
  }

  private async getOrderLineDetails(
    client: DbClient,
    lineId: string,
  ): Promise<OrderLineDetails> {
    const line = await client.orderLine.findUnique({
      where: { id: lineId },
      include: {
        order: {
          select: {
            status: true,
          },
        },
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
          },
        },
        reservations: true,
      },
    });

    if (!line) {
      throw new NotFoundException(`Order line with id ${lineId} was not found`);
    }

    const reservedQuantity = line.reservations.reduce(
      (sum, reservation) => sum + reservation.quantity,
      0,
    );

    return {
      id: line.id,
      orderId: line.orderId,
      productId: line.productId,
      qtyOrdered: line.qtyOrdered,
      qtyDispatched: line.qtyDispatched ?? 0,
      unitPrice: line.unitPrice,
      reservedQuantity,
      dispatchStatus: this.mapLineDispatchStatus(
        line.order.status,
        line.qtyOrdered,
        line.qtyDispatched ?? 0,
        reservedQuantity,
      ),
      product: line.product,
    };
  }

  private async reserveInventoryForLine(
    client: DbClient,
    lineId: string,
    productId: string,
    requestedQuantity: number,
  ): Promise<void> {
    const product = await client.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${productId} was not found`);
    }

    const items = await client.inventoryItem.findMany({
      where: {
        productId,
        quantity: {
          gt: 0,
        },
      },
      orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
    });

    const totalAvailable = items.reduce((sum, item) => {
      const available = Math.max(0, item.quantity - item.reservedQuantity);
      return sum + available;
    }, 0);

    if (totalAvailable < requestedQuantity) {
      throw new UnprocessableEntityException(
        `Insufficient stock for product ${product.name}. Requested ${requestedQuantity}, available ${totalAvailable}`,
      );
    }

    let remaining = requestedQuantity;

    for (const item of items) {
      if (remaining <= 0) {
        break;
      }

      const available = Math.max(0, item.quantity - item.reservedQuantity);

      if (available <= 0) {
        continue;
      }

      const allocation = Math.min(remaining, available);

      const updateResult = await client.inventoryItem.updateMany({
        where: {
          id: item.id,
          reservedQuantity: item.reservedQuantity,
          quantity: {
            gte: item.reservedQuantity + allocation,
          },
        },
        data: {
          reservedQuantity: {
            increment: allocation,
          },
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          `Reservation failed due to concurrent inventory changes for item ${item.id}`,
        );
      }

      await client.orderLineReservation.upsert({
        where: {
          orderLineId_itemId: {
            orderLineId: lineId,
            itemId: item.id,
          },
        },
        update: {
          quantity: {
            increment: allocation,
          },
        },
        create: {
          orderLineId: lineId,
          itemId: item.id,
          quantity: allocation,
        },
      });

      remaining -= allocation;
    }

    if (remaining > 0) {
      throw new ConflictException(
        'Reservation could not be completed due to concurrent stock changes',
      );
    }
  }

  private async releaseReservationsForLine(
    client: DbClient,
    lineId: string,
  ): Promise<void> {
    const reservations = await client.orderLineReservation.findMany({
      where: { orderLineId: lineId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const totalReserved = reservations.reduce(
      (sum, reservation) => sum + reservation.quantity,
      0,
    );

    if (totalReserved <= 0) {
      return;
    }

    await this.releaseReservationQuantity(client, lineId, totalReserved);
  }

  private async releaseReservationQuantity(
    client: DbClient,
    lineId: string,
    quantityToRelease: number,
  ): Promise<void> {
    if (quantityToRelease <= 0) {
      return;
    }

    const reservations = await client.orderLineReservation.findMany({
      where: { orderLineId: lineId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const totalReserved = reservations.reduce(
      (sum, reservation) => sum + reservation.quantity,
      0,
    );

    if (totalReserved < quantityToRelease) {
      throw new ConflictException(
        `Cannot release ${quantityToRelease} because only ${totalReserved} is reserved`,
      );
    }

    let remaining = quantityToRelease;

    for (const reservation of reservations) {
      if (remaining <= 0) {
        break;
      }

      const releaseAmount = Math.min(remaining, reservation.quantity);

      const updateResult = await client.inventoryItem.updateMany({
        where: {
          id: reservation.itemId,
          reservedQuantity: {
            gte: releaseAmount,
          },
        },
        data: {
          reservedQuantity: {
            decrement: releaseAmount,
          },
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          `Release failed due to concurrent inventory changes for item ${reservation.itemId}`,
        );
      }

      if (releaseAmount === reservation.quantity) {
        await client.orderLineReservation.delete({
          where: {
            id: reservation.id,
          },
        });
      } else {
        await client.orderLineReservation.update({
          where: {
            id: reservation.id,
          },
          data: {
            quantity: {
              decrement: releaseAmount,
            },
          },
        });
      }

      remaining -= releaseAmount;
    }
  }

  private validateCreateOrderPayload(body: CreateSalesOrderDto): void {
    if (!body.customerId?.trim()) {
      throw new BadRequestException('customerId is required');
    }

    if (body.channel) {
      this.validateChannel(body.channel);
    }

    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      throw new BadRequestException('lines must be a non-empty array');
    }

    for (const line of body.lines) {
      this.validateOrderLinePayload(line);
    }
  }

  private validateOrderLinePayload(line: AddOrderLineDto): void {
    if (!line.productId?.trim()) {
      throw new BadRequestException('productId is required');
    }

    if (!Number.isFinite(line.qtyOrdered) || line.qtyOrdered <= 0) {
      throw new BadRequestException('qtyOrdered must be a positive number');
    }

    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
      throw new BadRequestException('unitPrice must be a non-negative number');
    }
  }

  private validateOrderLineUpdatePayload(line: UpdateOrderLineDto): void {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new BadRequestException('quantity must be a positive number');
    }
  }

  private assertExportCustomerCountry(
    channel: string,
    customer: Pick<Customer, 'country'>,
  ): void {
    if (channel !== 'export') {
      return;
    }

    const normalizedCountry = customer.country?.trim().toUpperCase();

    if (!normalizedCountry || normalizedCountry === 'LK') {
      throw new UnprocessableEntityException(
        'Export orders require a customer with country not equal to LK',
      );
    }
  }

  private assertOrderStatus(
    actual: string,
    expected: OrderStatus,
    message: string,
  ): void {
    if (actual.toLowerCase() !== expected) {
      throw new BadRequestException(message);
    }
  }

  private mapOrderDispatchStatus(status: string): string {
    const normalized = status.toLowerCase();

    if (normalized === 'dispatched') {
      return 'dispatched';
    }

    if (normalized === 'cancelled') {
      return 'cancelled';
    }

    if (normalized === 'returned') {
      return 'returned';
    }

    return 'pending';
  }

  private mapLineDispatchStatus(
    orderStatus: string,
    qtyOrdered: number,
    qtyDispatched: number,
    reservedQuantity: number,
  ): string {
    const normalizedOrderStatus = orderStatus.toLowerCase();

    if (normalizedOrderStatus === 'cancelled') {
      return 'cancelled';
    }

    if (normalizedOrderStatus === 'returned') {
      return 'returned';
    }

    if (qtyOrdered > 0 && qtyDispatched >= qtyOrdered) {
      return 'dispatched';
    }

    if (qtyDispatched > 0) {
      return 'partially_dispatched';
    }

    if (reservedQuantity > 0) {
      return 'reserved';
    }

    return 'pending';
  }

  private validateOrderStatus(value: string): void {
    if (!ORDER_STATUS_SET.has(value)) {
      throw new BadRequestException(
        'status must be one of: pending, dispatched, cancelled, returned',
      );
    }
  }

  private validateChannel(value: string): void {
    if (!SALES_CHANNEL_SET.has(value)) {
      throw new BadRequestException(
        'channel must be one of: local, alumex_store, export',
      );
    }
  }

  private parseOptionalDate(value?: string | Date): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('orderDate must be a valid date');
    }

    return parsed;
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
