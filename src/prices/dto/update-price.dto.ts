import { PartialType } from '@nestjs/swagger';
import { CreatePriceAlertDto, CreatePriceDto } from './create-price.dto';

export class UpdatePriceDto extends PartialType(CreatePriceDto) {}

export class UpdatePriceAlertDto extends PartialType(CreatePriceAlertDto) {}
