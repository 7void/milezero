import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePincodeDto {
  @ApiProperty({ example: '560001' })
  @IsString()
  @IsNotEmpty()
  pincode: string;

  @ApiProperty({ example: 'MG Road / Brigade Road' })
  @IsString()
  @IsNotEmpty()
  areaName: string;

  @ApiPropertyOptional({ example: 12.9716 })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ example: 77.5946 })
  @IsNumber()
  @IsOptional()
  lng?: number;
}
