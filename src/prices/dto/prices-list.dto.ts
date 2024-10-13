import { Price } from '../entities/price.entity';

export interface PricesListDto {
  ethereum?: Price[];
  polygon?: Price[];
}

export enum TokeNames {
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon,',
}
