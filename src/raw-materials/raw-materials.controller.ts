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
import { RawMaterial } from '@prisma/client';
import { ApiResponse } from '../common/api-response.interface';
import { RAW_MATERIALS_ROUTES } from './raw-materials.routes';
import { RawMaterialsService } from './raw-materials.service';
import {
  type CreateRawMaterialDto,
  type RawMaterialWithSupplier,
  type UpdateRawMaterialDto,
} from './raw-materials.service';

@Controller(RAW_MATERIALS_ROUTES.BASE)
export class RawMaterialsController {
  constructor(private readonly rawMaterialsService: RawMaterialsService) {}

  @Get()
  async listRawMaterials(
    @Query('material_type') materialType?: string,
    @Query('grade') grade?: string,
    @Query('below_reorder_level') belowReorderLevelRaw?: string,
  ): Promise<ApiResponse<RawMaterial[]>> {
    try {
      const belowReorderLevel = this.parseBooleanFilter(
        belowReorderLevelRaw,
        'below_reorder_level',
      );

      const rawMaterials = await this.rawMaterialsService.listRawMaterials({
        materialType,
        grade,
        belowReorderLevel,
      });

      return {
        success: true,
        data: rawMaterials,
        message: 'Raw materials fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch raw materials');
    }
  }

  @Get(RAW_MATERIALS_ROUTES.BY_ID)
  async getRawMaterialById(
    @Param('id') id: string,
  ): Promise<ApiResponse<RawMaterialWithSupplier>> {
    try {
      const rawMaterial = await this.rawMaterialsService.getRawMaterialById(id);
      return {
        success: true,
        data: rawMaterial,
        message: 'Raw material fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch raw material');
    }
  }

  @Post()
  async createRawMaterial(
    @Body() body: CreateRawMaterialDto,
  ): Promise<ApiResponse<RawMaterial>> {
    try {
      const rawMaterial = await this.rawMaterialsService.createRawMaterial(body);
      return {
        success: true,
        data: rawMaterial,
        message: 'Raw material created successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to create raw material');
    }
  }

  @Put(RAW_MATERIALS_ROUTES.BY_ID)
  async updateRawMaterial(
    @Param('id') id: string,
    @Body() body: UpdateRawMaterialDto,
  ): Promise<ApiResponse<RawMaterial>> {
    try {
      const rawMaterial = await this.rawMaterialsService.updateRawMaterial(id, body);
      return {
        success: true,
        data: rawMaterial,
        message: 'Raw material updated successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to update raw material');
    }
  }

  @Delete(RAW_MATERIALS_ROUTES.BY_ID)
  async deleteRawMaterial(
    @Param('id') id: string,
  ): Promise<ApiResponse<RawMaterial>> {
    try {
      const rawMaterial = await this.rawMaterialsService.softDeleteRawMaterial(id);
      return {
        success: true,
        data: rawMaterial,
        message: 'Raw material deleted successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to delete raw material');
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
