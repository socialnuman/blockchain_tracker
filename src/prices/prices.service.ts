import { Injectable, NotFoundException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { Cron } from '@nestjs/schedule';
import { AlertSetting, Price } from './entities/price.entity';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { API_URL } from '../constants';
import { MailerService } from '@nestjs-modules/mailer';
import * as process from 'node:process';
import { PricesListDto, TokeNames } from './dto/prices-list.dto';
import { CreatePriceAlertDto } from './dto/create-price.dto';
import { UpdatePriceAlertDto } from './dto/update-price.dto';

@Injectable()
export class PricesService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Price) private priceRepository: Repository<Price>,
    @InjectRepository(AlertSetting)
    private alertSettingRepository: Repository<AlertSetting>,
    private readonly mailerService: MailerService,
  ) {}
  private async fetchPrice(chain: string): Promise<number> {
    const apiUrl = API_URL(chain);
    const response = await firstValueFrom(
      this.httpService.get(apiUrl, {
        headers: {
          accept: 'application/json',
          'x-cg-pro-api-key': process.env.CG_PRO_API_KEY,
        },
      }),
    );
    return response?.data[chain]?.usd || 0;
  }

  // Cron job to run every 5 minutes
  @Cron('* */ * * * *')
  async fetchAndSavePrices() {
    try {
      const chains = ['ethereum', 'polygon'];

      for (const chain of chains) {
        const price = await this.fetchPrice(chain);
        const priceRecord = new Price();
        priceRecord.chain = chain;
        priceRecord.price = price;
        try {
          await this.priceRepository.save(priceRecord);
          console.log(`Saved price for ${chain}: $${price}`);
        } catch (err) {
          console.log(`Failed to save price for ${chain}`);
        }
        await this.checkCustomPriceAlert(chain, Number(price));
      }
      await this.checkPriceIncrease();
    } catch (error) {
      console.log('Something went wrong', error?.message);
    }
  }

  // Check price change every 5 minutes
  async checkPriceIncrease() {
    const chains = ['ethereum', 'polygon'];
    for (const chain of chains) {
      const lastRecord = await this.priceRepository.findOne({
        where: { chain },
        order: { timestamp: 'DESC' }, // Get the most recent record
      });

      if (lastRecord) {
        const oneHourBeforeLastRecord = new Date(
          lastRecord.timestamp.getTime() - 60 * 60 * 1000,
        );

        const oneHourAgoRecord = await this.priceRepository.findOne({
          where: { chain, timestamp: LessThanOrEqual(oneHourBeforeLastRecord) },
          order: { timestamp: 'DESC' },
        });

        if (oneHourAgoRecord) {
          // Calculate the price change percentage
          const priceDifference = lastRecord.price - oneHourAgoRecord.price;
          const percentageChange =
            (priceDifference / oneHourAgoRecord.price) * 100;

          console.log(`Price change for ${chain}: ${percentageChange}%`);

          // If the price increased by more than 3%, send an email
          if (percentageChange > 3) {
            await this.sendAlertEmail(
              chain,
              lastRecord.price,
              percentageChange,
            );
          }
        } else {
          console.log('No record found one hour before the last record');
        }
      } else {
        console.log('No last record found for the chain');
      }
    }
  }

  // Send alert email if price increases more than 3%
  async sendAlertEmail(
    chain: string,
    currentPrice: number,
    percentageChange?: number,
    isCustomAlertEmail?: boolean,
    alertEmail?: string,
  ) {
    const email =
      (isCustomAlertEmail && alertEmail) || process.env.RECIEVER_EMAIL;
    const text =
      !isCustomAlertEmail || !alertEmail
        ? `${chain.toUpperCase()} price has increased by ${Number(percentageChange).toFixed(2)}%. The current price is $${Number(currentPrice).toFixed(2)}.`
        : `${chain.toUpperCase()} price has reached the alert price ${Number(currentPrice)}`;

    await this.mailerService.sendMail({
      to: email,
      subject: `${chain.toUpperCase()} Price Alert: ${percentageChange && `Increased by ${percentageChange.toFixed(2)}`}%`,
      template: !isCustomAlertEmail ? './price_alert' : './custom_price_alert',
      context: {
        chain,
        currentPrice,
        percentageChange,
      },
      text: text,
    });

    console.log(`Alert email sent to ${email} for ${chain}.`);
  }
  // Get hourly prices for the past 24 hours for a specific chain or all chains if no chain is provided
  async getHourlyPrices(chain?: string): Promise<PricesListDto> {
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const query = this.priceRepository
        .createQueryBuilder('price')
        .where('price.timestamp BETWEEN :start AND :end', {
          start: twentyFourHoursAgo,
          end: now,
        });

      // Apply chain filter if provided
      if (chain) {
        query.andWhere('price.chain = :chain', { chain });
      }

      query.orderBy('price.timestamp', 'ASC');

      const prices = await query.getMany();

      if (!chain) {
        return prices?.reduce((result, price) => {
          if (!result[price?.chain]) {
            result[price?.chain] = [];
          }
          result[price?.chain].push(price);
          return result;
        }, {});
      } else if (chain === TokeNames.ETHEREUM) {
        return { ethereum: prices };
      } else {
        return { polygon: prices };
      }
    } catch (err) {
      return Promise.reject(err);
    }
  }
  async getCurrentRates(): Promise<{
    ethToBtcRate: number;
    ethToUsdRate: number;
  }> {
    try {
      const ethToBtcRate = await this.getEthToBtcRate();
      const ethToUsdRate = await this.getEthToUsdRate();

      return { ethToBtcRate, ethToUsdRate };
    } catch (err) {
      return Promise.reject(err);
    }
  }

  private async getEthToBtcRate(): Promise<number> {
    const apiUrl = API_URL('ethereum', 'btc');
    const response = await firstValueFrom(
      this.httpService.get(apiUrl, {
        headers: {
          accept: 'application/json',
          'x-cg-pro-api-key': process.env.CG_PRO_API_KEY,
        },
      }),
    );
    return response?.data?.ethereum?.btc || 0;
  }

  private async getEthToUsdRate(): Promise<number> {
    const apiUrl = API_URL('ethereum', 'usd');
    const response = await firstValueFrom(
      this.httpService.get(apiUrl, {
        headers: {
          accept: 'application/json',
          'x-cg-pro-api-key': process.env.CG_PRO_API_KEY,
        },
      }),
    );
    return response?.data?.ethereum?.usd || 0;
  }
  public async setPriceAlertLimit(
    dto: CreatePriceAlertDto,
  ): Promise<AlertSetting> {
    try {
      return this.alertSettingRepository.save({
        ...dto,
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }
  private async checkCustomPriceAlert(chain: string, value: number) {
    const getPriceAlert = await this.alertSettingRepository
      .createQueryBuilder('alert')
      .where('alert.chain = :chain', { chain })
      .andWhere('alert.dollar <= :value', { value: Math.floor(value) }) // Change the comparison to <=
      .getOne();

    if (getPriceAlert) {
      await this.sendAlertEmail(chain, value, 0, true, getPriceAlert?.email);
    }
  }
  // In prices.service.ts
  async updatePriceAlertLimit(
    id: number,
    dto: UpdatePriceAlertDto,
  ): Promise<AlertSetting> {
    try {
      const alert = await this.alertSettingRepository.findOne({
        where: { id },
      });

      if (!alert) {
        throw new NotFoundException('Price alert not found');
      }

      alert.dollar = dto.dollar;
      alert.chain = dto.chain;
      alert.email = dto.email;

      return this.alertSettingRepository.save(alert);
    } catch (err) {
      return Promise.reject(err);
    }
  }
  async deletePriceAlertLimit(id: number): Promise<boolean> {
    try {
      const alert = await this.alertSettingRepository.findOne({
        where: { id },
      });

      if (!alert) {
        throw new NotFoundException('Price alert not found');
      }

      await this.alertSettingRepository.remove(alert);
      return true;
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
