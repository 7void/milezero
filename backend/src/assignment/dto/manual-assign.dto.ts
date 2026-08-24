import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ManualAssignDto {
  @ApiProperty({ description: 'Order ID to assign' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: 'Agent Profile ID to assign to' })
  @IsString()
  @IsNotEmpty()
  agentId: string;

  @ApiPropertyOptional({ description: 'Optional administrative assignment note' })
  @IsString()
  @IsOptional()
  notes?: string;
}
