import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType, PaymentMode } from '@prisma/client';

export class CalculateQuoteDto {
  @ApiProperty({ example: '560001', description: 'Pickup address pincode' })
  @IsString()
  @IsNotEmpty()
  pickupPincode: string;

  @ApiProperty({ example: '560066', description: 'Drop address pincode' })
  @IsString()
  @IsNotEmpty()
  dropPincode: string;

  @ApiProperty({ example: 30, description: 'Package length in cm' })
  @IsNumber()
  @IsPositive()
  lengthCm: number;

  @ApiProperty({ example: 20, description: 'Package width in cm' })
  @IsNumber()
  @IsPositive()
  widthCm: number;

  @ApiProperty({ example: 15, description: 'Package height in cm' })
  @IsNumber()
  @IsPositive()
  heightCm: number;

  @ApiProperty({ example: 2.5, description: 'Actual package weight in kg' })
  @IsNumber()
  @Min(0.01)
  actualWeightKg: number;

  @ApiPropertyOptional({ enum: ServiceType, default: ServiceType.B2C })
  @IsEnum(ServiceType)
  @IsOptional()
  serviceType?: ServiceType = ServiceType.B2C;

  @ApiPropertyOptional({ enum: PaymentMode, default: PaymentMode.PREPAID })
  @IsEnum(PaymentMode)
  @IsOptional()
  paymentMode?: PaymentMode = PaymentMode.PREPAID;

  @ApiPropertyOptional({ example: 1500, description: 'Order value if COD' })
  @IsNumber()
  @IsOptional()
  orderValue?: number;
}
