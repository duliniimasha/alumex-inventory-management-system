import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  InternalServerErrorException,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiResponse } from '../common/api-response.interface';
import {
  ORDER_STATUSES,
  SALES_CHANNELS,
  SALES_ORDERS_ROUTES,
  type OrderStatus,
  type SalesChannel,
} from './sales-orders.routes';
import { SalesOrdersService } from './sales-orders.service';
import type {
  AddOrderLineDto,
  CreateSalesOrderDto,
  OrderLineDetails,
  ReturnOrderDto,
  SalesOrderDetails,
  SalesOrderListItem,
} from './sales-orders.service';

const ORDER_STATUS_SET = new Set<string>(ORDER_STATUSES);
const SALES_CHANNEL_SET = new Set<string>(SALES_CHANNELS);

@Controller(SALES_ORDERS_ROUTES.BASE)
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  async listOrders(
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('customer_id') customerId?: string,
    @Query('start_date') startDateRaw?: string,
    @Query('end_date') endDateRaw?: string,
  ): Promise<ApiResponse<SalesOrderListItem[]>> {
    try {
      const startDate = this.parseDateFilter(startDateRaw, 'start_date');
      const endDate = this.parseDateFilter(endDateRaw, 'end_date');
      const parsedStatus = status ? this.parseStatusFilter(status) : undefined;
      const parsedChannel = channel
        ? this.parseChannelFilter(channel)
        : undefined;

      if (startDate && endDate && startDate > endDate) {
        throw new BadRequestException('start_date must be before end_date');
      }

      const data = await this.salesOrdersService.listOrders({
        status: parsedStatus,
        channel: parsedChannel,
        customerId,
        startDate,
        endDate,
      });

      return {
        success: true,
        data,
        message: 'Sales orders fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch sales orders');
    }
  }

  @Get(SALES_ORDERS_ROUTES.BY_ID)
  async getOrderById(
    @Param('id') id: string,
  ): Promise<ApiResponse<SalesOrderDetails>> {
    try {
      const data = await this.salesOrdersService.getOrderById(id);

      return {
        success: true,
        data,
        message: 'Sales order fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch sales order');
    }
  }

  @Post()
  async createOrder(
    @Body()
    body: {
      customerId?: string;
      customer_id?: string;
      channel?: string;
      orderDate?: string;
      order_date?: string;
      lines?: Array<{
        productId?: string;
        product_id?: string;
        qtyOrdered?: number;
        qty_ordered?: number;
        unitPrice?: number;
        unit_price?: number;
      }>;
    },
  ): Promise<ApiResponse<SalesOrderDetails>> {
    try {
      const normalizedBody: CreateSalesOrderDto = {
        customerId: body.customerId ?? body.customer_id ?? '',
        channel: body.channel as CreateSalesOrderDto['channel'],
        orderDate: body.orderDate ?? body.order_date,
        lines:
          body.lines?.map((line) => ({
            productId: line.productId ?? line.product_id ?? '',
            qtyOrdered: line.qtyOrdered ?? line.qty_ordered ?? Number.NaN,
            unitPrice: line.unitPrice ?? line.unit_price ?? Number.NaN,
          })) ?? [],
      };

      const data = await this.salesOrdersService.createOrder(normalizedBody);

      return {
        success: true,
        data,
        message: 'Sales order created successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to create sales order');
    }
  }

  @Put(SALES_ORDERS_ROUTES.DISPATCH)
  async dispatchOrder(
    @Param('id') id: string,
    @Req() request: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<SalesOrderDetails>> {
    try {
      const actorUserId = request.user?.id ?? userIdHeader;
      const data = await this.salesOrdersService.dispatchOrder(id, actorUserId);

      return {
        success: true,
        data,
        message: 'Sales order dispatched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to dispatch sales order');
    }
  }

  @Put(SALES_ORDERS_ROUTES.CANCEL)
  async cancelOrder(
    @Param('id') id: string,
  ): Promise<ApiResponse<SalesOrderDetails>> {
    try {
      const data = await this.salesOrdersService.cancelOrder(id);

      return {
        success: true,
        data,
        message: 'Sales order cancelled successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to cancel sales order');
    }
  }

  @Post(SALES_ORDERS_ROUTES.RETURN)
  async returnOrder(
    @Param('id') id: string,
    @Body()
    body: {
      reason?: string;
    },
    @Req() request: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<SalesOrderDetails>> {
    try {
      const actorUserId = request.user?.id ?? userIdHeader;
      const payload: ReturnOrderDto = {
        reason: body.reason,
      };
      const data = await this.salesOrdersService.returnOrder(
        id,
        payload,
        actorUserId,
      );

      return {
        success: true,
        data,
        message: 'Sales order returned successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to return sales order');
    }
  }

  @Post(SALES_ORDERS_ROUTES.LINES)
  async addOrderLine(
    @Param('orderId') orderId: string,
    @Body()
    body: {
      productId?: string;
      product_id?: string;
      qtyOrdered?: number;
      qty_ordered?: number;
      unitPrice?: number;
      unit_price?: number;
    },
  ): Promise<ApiResponse<OrderLineDetails>> {
    try {
      const payload: AddOrderLineDto = {
        productId: body.productId ?? body.product_id ?? '',
        qtyOrdered: body.qtyOrdered ?? body.qty_ordered ?? Number.NaN,
        unitPrice: body.unitPrice ?? body.unit_price ?? Number.NaN,
      };

      const data = await this.salesOrdersService.addOrderLine(orderId, payload);

      return {
        success: true,
        data,
        message: 'Order line added successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to add order line');
    }
  }

  private parseDateFilter(
    value: string | undefined,
    fieldName: string,
  ): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return parsed;
  }

  private parseStatusFilter(value: string): OrderStatus {
    if (!ORDER_STATUS_SET.has(value)) {
      throw new BadRequestException(
        'status must be one of: pending, dispatched, cancelled, returned',
      );
    }

    return value as OrderStatus;
  }

  private parseChannelFilter(value: string): SalesChannel {
    if (!SALES_CHANNEL_SET.has(value)) {
      throw new BadRequestException(
        'channel must be one of: local, alumex_store, export',
      );
    }

    return value as SalesChannel;
  }

  private handleControllerError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
