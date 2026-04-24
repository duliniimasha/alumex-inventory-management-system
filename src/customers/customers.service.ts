import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CUSTOMER_TYPES,
  type CustomerListFilters,
  type CustomerType,
} from './customers.routes';

const CUSTOMER_TYPE_SET = new Set<string>(CUSTOMER_TYPES);

export interface CreateCustomerDto {
  name: string;
  type?: CustomerType;
  country?: string;
  contactEmail?: string;
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {}

export interface CustomerOrderHistorySummary {
  totalOrders: number;
  pendingOrders: number;
  dispatchedOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  totalOrderedQuantity: number;
  totalOrderValue: number;
  lastOrderDate: Date | null;
}

export type CustomerWithOrderHistorySummary = Customer & {
  orderHistorySummary: CustomerOrderHistorySummary;
};

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async listCustomers(filters: CustomerListFilters): Promise<Customer[]> {
    try {
      const where: Prisma.CustomerWhereInput = {};

      if (filters.type) {
        this.validateCustomerType(filters.type);
        where.type = filters.type;
      }

      if (filters.country) {
        where.country = {
          equals: filters.country,
          mode: 'insensitive',
        };
      }

      if (filters.ownerUserId) {
        where.ownerUserId = filters.ownerUserId;
      }

      return await this.prisma.customer.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      });
    } catch (error) {
      this.handleError(error, 'Failed to list customers');
    }
  }

  async getCustomerWithOrderHistorySummary(
    id: string,
  ): Promise<CustomerWithOrderHistorySummary> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with id ${id} was not found`);
      }

      const orders = await this.prisma.salesOrder.findMany({
        where: { customerId: id },
        select: {
          id: true,
          status: true,
          orderDate: true,
          orderLines: {
            select: {
              qtyOrdered: true,
              unitPrice: true,
            },
          },
        },
        orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
      });

      const summary: CustomerOrderHistorySummary = {
        totalOrders: orders.length,
        pendingOrders: 0,
        dispatchedOrders: 0,
        cancelledOrders: 0,
        returnedOrders: 0,
        totalOrderedQuantity: 0,
        totalOrderValue: 0,
        lastOrderDate: orders[0]?.orderDate ?? null,
      };

      for (const order of orders) {
        const normalizedStatus = order.status.toLowerCase();

        if (normalizedStatus === 'pending') {
          summary.pendingOrders += 1;
        } else if (normalizedStatus === 'dispatched') {
          summary.dispatchedOrders += 1;
        } else if (normalizedStatus === 'cancelled') {
          summary.cancelledOrders += 1;
        } else if (normalizedStatus === 'returned') {
          summary.returnedOrders += 1;
        }

        for (const line of order.orderLines) {
          summary.totalOrderedQuantity += line.qtyOrdered;
          summary.totalOrderValue += line.qtyOrdered * line.unitPrice;
        }
      }

      return {
        ...customer,
        orderHistorySummary: summary,
      };
    } catch (error) {
      this.handleError(error, 'Failed to get customer');
    }
  }

  async createCustomer(
    body: CreateCustomerDto,
    ownerUserId?: string,
  ): Promise<Customer> {
    try {
      if (!body.name?.trim()) {
        throw new BadRequestException('name is required');
      }

      if (body.type) {
        this.validateCustomerType(body.type);
      }

      return await this.prisma.customer.create({
        data: {
          name: body.name.trim(),
          type: body.type,
          country: body.country?.trim() || null,
          contactEmail: body.contactEmail?.trim() || null,
          ownerUserId: ownerUserId?.trim() || null,
        },
      });
    } catch (error) {
      this.handleError(error, 'Failed to create customer');
    }
  }

  async updateCustomer(id: string, body: UpdateCustomerDto): Promise<Customer> {
    try {
      await this.ensureCustomerExists(id);

      if (body.type) {
        this.validateCustomerType(body.type);
      }

      if (body.name !== undefined && !body.name.trim()) {
        throw new BadRequestException('name cannot be empty');
      }

      return await this.prisma.customer.update({
        where: { id },
        data: {
          name: body.name?.trim(),
          type: body.type,
          country:
            body.country !== undefined
              ? (body.country.trim() || null)
              : undefined,
          contactEmail:
            body.contactEmail !== undefined
              ? (body.contactEmail.trim() || null)
              : undefined,
        },
      });
    } catch (error) {
      this.handleError(error, 'Failed to update customer');
    }
  }

  private async ensureCustomerExists(id: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with id ${id} was not found`);
    }
  }

  private validateCustomerType(value: string): void {
    if (!CUSTOMER_TYPE_SET.has(value)) {
      throw new BadRequestException(
        'type must be one of: B2B, fabricator, export, retail',
      );
    }
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
