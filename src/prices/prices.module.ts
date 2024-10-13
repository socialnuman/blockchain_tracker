import { Module } from '@nestjs/common';
import { PricesService } from './prices.service';
import { PricesController } from './prices.controller';
import { HttpModule } from '@nestjs/axios';
import { AlertSetting, Price } from './entities/price.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Price, AlertSetting]), HttpModule],
  providers: [PricesService],
  controllers: [PricesController],
  exports: [PricesService], // Exporting PricesService if needed elsewhere
})
export class PricesModule {}
