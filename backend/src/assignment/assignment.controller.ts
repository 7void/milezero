import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssignmentService } from './assignment.service';
import { ManualAssignDto } from './dto/manual-assign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Agent Assignment')
@Controller('assignment')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post('manual')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Manually assign an agent to an order (Admin only)' })
  async manualAssign(@Body() dto: ManualAssignDto, @CurrentUser() user: any) {
    return this.assignmentService.assignManually(dto, user);
  }

  @Post('auto')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Trigger automatic agent assignment for a specific order (Admin only)' })
  async autoAssign(@Body('orderId') orderId: string) {
    return this.assignmentService.autoAssignOrder(orderId);
  }

  @Post('auto-all')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Batch auto-assign all pending orders in queue (Admin only)' })
  async autoAssignAll() {
    return this.assignmentService.autoAssignAllPending();
  }
}
