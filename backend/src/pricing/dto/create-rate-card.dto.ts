import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType, CodFeeType } from '@prisma/client';

export class CreateRateCardDto {
  @ApiProperty({ example: 'B2C-STD-EXPRESS' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'B2C Standard Express' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ServiceType, default: ServiceType.B2C })
  @IsEnum(ServiceType)
  @IsNotEmpty()
  serviceType: ServiceType;

  @ApiProperty({ example: 1.0, description: 'Base weight included in base price (kg)' })
  @IsNumber()
  @IsPositive()
  baseWeightKg: number;

  @ApiProperty({ example: 40.0, description: 'Base price for intra-zone deliveries' })
  @IsNumber()
  @Min(0)
  basePriceIntra: number;

  @ApiProperty({ example: 70.0, description: 'Base price for inter-zone deliveries' })
  @IsNumber()
  @Min(0)
  basePriceInter: number;

  @ApiProperty({ example: 20.0, description: 'Incremental rate per kg above base weight (intra-zone)' })
  @IsNumber()
  @Min(0)
  perKgRateIntra: number;

  @ApiProperty({ example: 35.0, description: 'Incremental rate per kg above base weight (inter-zone)' })
  @IsNumber()
  @Min(0)
  perKgRateInter: number;

  @ApiPropertyOptional({ example: 40.0, description: 'Minimum charge for this rate card' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minCharge?: number = 0;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiPropertyOptional({ example: 'Standard consumer delivery rate card' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateRateCardDto {
  @ApiPropertyOptional({ example: 'B2C Standard Express' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: ServiceType })
  @IsEnum(ServiceType)
  @IsOptional()
  serviceType?: ServiceType | null;

  @ApiPropertyOptional({ example: 1.0 })
  @IsNumber()
  @IsOptional()
  baseWeightKg?: number;

  @ApiPropertyOptional({ example: 45.0 })
  @IsNumber()
  @IsOptional()
  basePriceIntra?: number;

  @ApiPropertyOptional({ example: 75.0 })
  @IsNumber()
  @IsOptional()
  basePriceInter?: number;

  @ApiPropertyOptional({ example: 22.0 })
  @IsNumber()
  @IsOptional()
  perKgRateIntra?: number;

  @ApiPropertyOptional({ example: 38.0 })
  @IsNumber()
  @IsOptional()
  perKgRateInter?: number;

  @ApiPropertyOptional({ example: 40.0 })
  @IsNumber()
  @IsOptional()
  minCharge?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateCodConfigDto {
  @ApiPropertyOptional({ example: 'Standard COD Surcharge' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: ServiceType, description: 'Order type this COD rule applies to. Omit for global fallback.' })
  @IsEnum(ServiceType)
  @IsOptional()
  serviceType?: ServiceType;

  @ApiPropertyOptional({ enum: CodFeeType })
  @IsEnum(CodFeeType)
  @IsOptional()
  feeType?: CodFeeType;

  @ApiPropertyOptional({ example: 40.0 })
  @IsNumber()
  @IsOptional()
  flatFee?: number;

  @ApiPropertyOptional({ example: 2.0, description: 'Percentage fee (e.g. 2.0 for 2%)' })
  @IsNumber()
  @IsOptional()
  percentageFee?: number;

  @ApiPropertyOptional({ example: 30.0 })
  @IsNumber()
  @IsOptional()
  minFee?: number;

  @ApiPropertyOptional({ example: 500.0 })
  @IsNumber()
  @IsOptional()
  maxFee?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
