import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type { Role } from '@prisma/client';
import { ApiResponse } from '../common/api-response.interface';
import { ROLE_SLUGS, roleSlugToEnum } from '../auth/role.util';
import { USERS_ROUTES, type UserListFilters } from './users.routes';
import {
  type ResetPasswordDto,
  type UpdateUserDto,
  type UserWithCounts,
  UsersService,
} from './users.service';

@Controller(USERS_ROUTES.BASE)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async listUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('role') role?: string,
    @Query('department') department?: string,
    @Query('is_active') isActiveRaw?: string,
    @Query('search') search?: string,
  ): Promise<ApiResponse<UserWithCounts[]>> {
    try {
      const filters: UserListFilters = {
        role: this.parseRoleFilter(role),
        department,
        isActive: this.parseBooleanFilter(isActiveRaw, 'is_active'),
        search,
      };

      const { users, pagination } = await this.usersService.listUsers(
        page,
        limit,
        filters,
      );

      return {
        success: true,
        data: users,
        message: 'Users fetched successfully',
        pagination,
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch users');
    }
  }

  @Get(USERS_ROUTES.BY_ID)
  async getUserById(@Param('id') id: string) {
    try {
      const user = await this.usersService.getUserById(id);
      return {
        success: true,
        data: user,
        message: 'User fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch user');
    }
  }

  @Put(USERS_ROUTES.BY_ID)
  async updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ) {
    try {
      const user = await this.usersService.updateUser(id, body);
      return {
        success: true,
        data: user,
        message: 'User updated successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to update user');
    }
  }

  @Patch(USERS_ROUTES.ACTIVE)
  async toggleUserActive(
    @Param('id') id: string,
    @Body() body: { is_active?: boolean },
  ) {
    try {
      if (typeof body.is_active !== 'boolean') {
        throw new BadRequestException('is_active must be a boolean');
      }

      const user = await this.usersService.toggleUserActive(id, body.is_active);
      return {
        success: true,
        data: user,
        message: 'User status updated successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to update user status');
    }
  }

  @Post(USERS_ROUTES.RESET_PASSWORD)
  async resetPassword(
    @Param('id') id: string,
    @Body() body: ResetPasswordDto,
  ): Promise<ApiResponse<{ success: boolean }>> {
    try {
      await this.usersService.resetPassword(id, body);
      return {
        success: true,
        data: { success: true },
        message: 'Password reset successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to reset password');
    }
  }

  private parseBooleanFilter(
    value: string | undefined,
    fieldName: string,
  ): boolean | undefined {
    if (value === undefined) {
      return undefined;
    }

    const normalized = value.toLowerCase();

    if (normalized === 'true' || normalized === '1') {
      return true;
    }

    if (normalized === 'false' || normalized === '0') {
      return false;
    }

    throw new BadRequestException(
      `${fieldName} must be a boolean value (true/false)`,
    );
  }

  private parseRoleFilter(role?: string): Role | undefined {
    if (!role) {
      return undefined;
    }

    try {
      return roleSlugToEnum(role);
    } catch {
      throw new BadRequestException(
        `role must be one of: ${ROLE_SLUGS.join(', ')}`,
      );
    }
  }

  private handleControllerError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
