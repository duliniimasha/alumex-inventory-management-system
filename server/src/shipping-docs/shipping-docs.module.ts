import { Module } from '@nestjs/common';
import { ShippingDocsController } from './shipping-docs.controller';

@Module({
  controllers: [ShippingDocsController],
})
export class ShippingDocsModule {}
