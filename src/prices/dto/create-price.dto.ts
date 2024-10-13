import { IsNotEmpty, IsEmail, IsNumber, IsString, Min } from 'class-validator';

export class CreatePriceDto {}

export class CreatePriceAlertDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  dollar: number;

  @IsNotEmpty()
  @IsString()
  chain: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;
}
