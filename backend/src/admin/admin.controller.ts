import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Admin Operations & Analytics')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get operational KPIs and performance analytics' })
  async getMetrics() {
    return this.adminService.getOperationsMetrics();
  }

  @Get('fleet-overview')
  @ApiOperation({ summary: 'Get live global operations map snapshot of active agents & shipments' })
  async getFleetOverview() {
    return this.adminService.getFleetLiveOverview();
  }
}
