import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PricesService } from './prices.service';
import { ApiQuery } from '@nestjs/swagger';
import { PricesListDto } from './dto/prices-list.dto';
import { AlertSetting } from './entities/price.entity';
import { CreatePriceAlertDto } from './dto/create-price.dto';
import { UpdatePriceAlertDto } from './dto/update-price.dto';

@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  // Endpoint to get prices within the last 24 hours for a specific chain
  @Get('hourly')
  @ApiQuery({
    name: 'chain',
    required: false,
    description: 'The blockchain to filter by (optional)',
  })
  async getHourlyPrices(
    @Query('chain') chain?: string,
  ): Promise<PricesListDto> {
    return await this.pricesService.getHourlyPrices(chain?.toLowerCase());
  }

  @Get('eth-to-btc')
  async getSwapRate(@Query('ethAmount') ethAmount: number) {
    // Get the current rates for ETH to BTC and ETH to USD
    const { ethToBtcRate, ethToUsdRate } =
      await this.pricesService.getCurrentRates();

    // Calculate the total fee (3% of the input ETH)
    const feePercentage = 0.03;
    const feeEth = ethAmount * feePercentage;
    const feeUsd = feeEth * ethToUsdRate;

    // Subtract the fee from the input ETH to get the effective ETH amount for swap
    const effectiveEthAmount = ethAmount - feeEth;

    // Calculate the amount of BTC the user will receive after the fee
    const btcAmount = effectiveEthAmount * ethToBtcRate;

    // Return the results
    return {
      btcAmount,
      fee: {
        eth: feeEth,
        usd: feeUsd,
      },
    };
  }
  @Post('set-limit')
  async setPriceAlertLimit(
    @Body() dto: CreatePriceAlertDto,
  ): Promise<AlertSetting> {
    return await this.pricesService.setPriceAlertLimit(dto);
  }
  @Patch('update-limit/:id')
  async updatePriceAlertLimit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePriceAlertDto,
  ): Promise<AlertSetting> {
    return await this.pricesService.updatePriceAlertLimit(id, dto);
  }
  // In prices.controller.ts
  @Delete('delete-limit/:id')
  async deletePriceAlertLimit(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<boolean> {
    return await this.pricesService.deletePriceAlertLimit(id);
  }
}
