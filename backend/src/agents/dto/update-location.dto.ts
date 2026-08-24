import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLocationDto {
  @ApiProperty({ example: 12.9716, description: 'Latitude' })
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @ApiProperty({ example: 77.5946, description: 'Longitude' })
  @IsNumber()
  @IsNotEmpty()
  lng: number;

  @ApiPropertyOptional({ example: 'ZONE-CENTRAL' })
  @IsString()
  @IsOptional()
  zoneId?: string;
}
