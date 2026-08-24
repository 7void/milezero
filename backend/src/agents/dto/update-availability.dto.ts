import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AgentStatus } from '@prisma/client';

export class UpdateAvailabilityDto {
  @ApiProperty({ enum: AgentStatus, example: AgentStatus.AVAILABLE })
  @IsEnum(AgentStatus)
  @IsNotEmpty()
  status: AgentStatus;
}
