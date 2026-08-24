import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PICKED_UP })
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;

  @ApiPropertyOptional({ example: 'Package picked up from warehouse dock A' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'Customer Unavailable', description: 'Required when status is FAILED' })
  @IsString()
  @IsOptional()
  failureReason?: string;

  @ApiPropertyOptional({ example: 12.9716 })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ example: 77.5946 })
  @IsNumber()
  @IsOptional()
  lng?: number;
}

export class RescheduleOrderDto {
  @ApiProperty({ example: '2026-08-22T10:00:00.000Z', description: 'New requested delivery date' })
  @IsString()
  @IsNotEmpty()
  newDeliveryDate: string;

  @ApiPropertyOptional({ example: 'Please deliver after 2 PM' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: true, description: 'Attempt immediate auto re-assignment' })
  @IsOptional()
  autoReassign?: boolean = true;
}

export class AdminOverrideDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  newStatus: OrderStatus;

  @ApiProperty({ example: 'Exception override: customer confirmed manual pickup from warehouse hub' })
  @IsString()
  @IsNotEmpty()
  auditReason: string;

  @ApiPropertyOptional({ description: 'Optional agent ID reassignment' })
  @IsString()
  @IsOptional()
  newAgentId?: string;
}
