import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationMeta } from '../common/api-response.interface';
import { roleSlugToEnum, type RoleSlug } from '../auth/role.util';
import { SupabaseService } from '../auth/supabase.service';
import { PrismaService } from '../prisma/prisma.service';
import type { UserListFilters } from './users.routes';

export interface UpdateUserDto {
  name?: string;
  role?: RoleSlug;
  department?: string;
  is_active?: boolean;
}

export interface ResetPasswordDto {
  new_password: string;
  confirm_password: string;
}

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  isActive: true,
  createdAt: true,
  _count: {
    select: {
      stockMovements: true,
      auditLogs: true,
    },
  },
} satisfies Prisma.UserSelect;

export type UserWithCounts = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  async listUsers(
    page = 1,
    limit = 10,
    filters: UserListFilters = {},
  ): Promise<{ users: UserWithCounts[]; pagination: PaginationMeta }> {
    try {
      const safePage = Math.max(page, 1);
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const skip = (safePage - 1) * safeLimit;
      const where: Prisma.UserWhereInput = {};

      if (filters.role) {
        where.role = filters.role;
      }

      const normalizedDepartment = filters.department?.trim();
      if (normalizedDepartment) {
        where.department = {
          equals: normalizedDepartment,
          mode: 'insensitive',
        };
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      const normalizedSearch = filters.search?.trim();
      if (normalizedSearch) {
        where.OR = [
          {
            name: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
          {
            department: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
        ];
      }

      const [total, users] = await this.prisma.$transaction([
        this.prisma.user.count({ where }),
        this.prisma.user.findMany({
          where,
          skip,
          take: safeLimit,
          orderBy: { createdAt: 'desc' },
          select: USER_SELECT,
        }),
      ]);

      return {
        users,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
        },
      };
    } catch (error) {
      this.handleError(error, 'Failed to list users');
    }
  }

  async getUserById(id: string): Promise<UserWithCounts> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: USER_SELECT,
      });

      if (!user) {
        throw new NotFoundException(`User with id ${id} was not found`);
      }

      return user;
    } catch (error) {
      this.handleError(error, 'Failed to get user');
    }
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<UserWithCounts> {
    try {
      await this.getUserById(id);

      const data: Prisma.UserUpdateInput = {};

      if (dto.name !== undefined) {
        data.name = dto.name.trim();
      }

      if (dto.department !== undefined) {
        data.department = dto.department?.trim() || null;
      }

      if (dto.role !== undefined) {
        data.role = roleSlugToEnum(dto.role);
      }

      if (dto.is_active !== undefined) {
        data.isActive = dto.is_active;
      }

      if (Object.keys(data).length === 0) {
        return await this.getUserById(id);
      }

      return await this.prisma.user.update({
        where: { id },
        data,
        select: USER_SELECT,
      });
    } catch (error) {
      this.handleError(error, 'Failed to update user');
    }
  }

  async toggleUserActive(id: string, isActive: boolean): Promise<UserWithCounts> {
    try {
      await this.getUserById(id);
      return await this.prisma.user.update({
        where: { id },
        data: { isActive },
        select: USER_SELECT,
      });
    } catch (error) {
      this.handleError(error, 'Failed to update user status');
    }
  }

  async resetPassword(id: string, dto: ResetPasswordDto): Promise<void> {
    try {
      await this.getUserById(id);
      this.ensurePasswordValid(dto.new_password);

      if (dto.new_password !== dto.confirm_password) {
        throw new BadRequestException('Passwords do not match');
      }

      // Passwords are owned by Supabase Auth (the user id equals the auth id).
      await this.supabase.updateAuthUserPassword(id, dto.new_password);
    } catch (error) {
      this.handleError(error, 'Failed to reset password');
    }
  }

  private ensurePasswordValid(password: string): void {
    if (!password) {
      throw new BadRequestException('Password is required');
    }

    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      throw new BadRequestException(
        `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters long`,
      );
    }
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    if (error instanceof Error && error.message.startsWith('Unsupported role')) {
      throw new BadRequestException(error.message);
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
