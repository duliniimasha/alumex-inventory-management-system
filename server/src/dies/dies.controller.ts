import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Die } from '@prisma/client';
import { ApiResponse } from '../common/api-response.interface';
import { DIES_ROUTES } from './dies.routes';
import { DiesService } from './dies.service';
import type { CreateDieDto, UpdateDieDto } from './dies.service';

@Controller(DIES_ROUTES.BASE)
export class DiesController {
  constructor(private readonly diesService: DiesService) {}

  @Get()
  async listDies(
    @Query('profile_code') profileCode?: string,
    @Query('condition') condition?: string,
    @Query('near_max_usage') nearMaxUsageRaw?: string,
  ): Promise<ApiResponse<Die[]>> {
    try {
      const nearMaxUsage = this.parseBooleanFilter(
        nearMaxUsageRaw,
        'near_max_usage',
      );

      const dies = await this.diesService.listDies({
        profileCode,
        condition,
        nearMaxUsage,
      });

      return {
        success: true,
        data: dies,
        message: 'Dies fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch dies');
    }
  }

  @Get(DIES_ROUTES.BY_ID)
  async getDieById(@Param('id') id: string): Promise<ApiResponse<Die>> {
    try {
      const die = await this.diesService.getDieById(id);
      return {
        success: true,
        data: die,
        message: 'Die fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch die');
    }
  }

  @Post()
  async createDie(@Body() body: CreateDieDto): Promise<ApiResponse<Die>> {
    try {
      const die = await this.diesService.createDie(body);
      return {
        success: true,
        data: die,
        message: 'Die created successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to create die');
    }
  }

  @Put(DIES_ROUTES.BY_ID)
  async updateDie(
    @Param('id') id: string,
    @Body() body: UpdateDieDto,
  ): Promise<ApiResponse<Die>> {
    try {
      const die = await this.diesService.updateDie(id, body);
      return {
        success: true,
        data: die,
        message: 'Die updated successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to update die');
    }
  }

  @Delete(DIES_ROUTES.BY_ID)
  async deleteDie(@Param('id') id: string): Promise<ApiResponse<Die>> {
    try {
      const die = await this.diesService.softDeleteDie(id);
      return {
        success: true,
        data: die,
        message: 'Die deleted successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to delete die');
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

  private handleControllerError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
