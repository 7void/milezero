import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType, PaymentMode } from '@prisma/client';

export class AddressInputDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  contactName: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '123 MG Road' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiPropertyOptional({ example: 'Flat 4B, Prestige Towers' })
  @IsString()
  @IsOptional()
  apartment?: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '560001' })
  @IsString()
  @IsNotEmpty()
  pincode: string;

  @ApiPropertyOptional({ example: 12.9716 })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ example: 77.5946 })
  @IsNumber()
  @IsOptional()
  lng?: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: AddressInputDto })
  @ValidateNested()
  @Type(() => AddressInputDto)
  pickupAddress: AddressInputDto;

  @ApiProperty({ type: AddressInputDto })
  @ValidateNested()
  @Type(() => AddressInputDto)
  dropAddress: AddressInputDto;

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

  @ApiProperty({ example: 2.5, description: 'Actual weight in kg' })
  @IsNumber()
  @Min(0.01)
  actualWeightKg: number;

  @ApiProperty({ example: 'Electronics - High Value Monitor' })
  @IsString()
  @IsNotEmpty()
  packageDescription: string;

  @ApiPropertyOptional({ example: 'Electronics' })
  @IsString()
  @IsOptional()
  packageCategory?: string;

  @ApiPropertyOptional({ enum: ServiceType, default: ServiceType.B2C })
  @IsEnum(ServiceType)
  @IsOptional()
  serviceType?: ServiceType = ServiceType.B2C;

  @ApiPropertyOptional({ enum: PaymentMode, default: PaymentMode.PREPAID })
  @IsEnum(PaymentMode)
  @IsOptional()
  paymentMode?: PaymentMode = PaymentMode.PREPAID;

  @ApiPropertyOptional({ example: 'Please ring bell twice and leave at security if unavailable' })
  @IsString()
  @IsOptional()
  specialInstructions?: string;

  @ApiPropertyOptional({ description: 'Specific customer user ID if admin is creating order' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ example: true, description: 'Auto-dispatch immediate assignment if available' })
  @IsOptional()
  autoAssign?: boolean = true;
}
