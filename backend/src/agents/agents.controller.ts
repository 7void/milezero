import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, AgentStatus } from '@prisma/client';

@ApiTags('Delivery Agents')
@Controller('agents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT)
  @ApiOperation({ summary: 'Get current agent profile' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.agentsService.getAgentProfileByUserId(userId);
  }

  @Patch('me/availability')
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT)
  @ApiOperation({ summary: 'Update agent availability (AVAILABLE, BUSY, OFFLINE)' })
  async updateMyAvailability(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.agentsService.updateAvailability(userId, dto);
  }

  @Patch('me/location')
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT)
  @ApiOperation({ summary: 'Update agent current GPS coordinates' })
  async updateMyLocation(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.agentsService.updateLocation(userId, dto);
  }

  @Post('me/simulate-step')
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT)
  @ApiOperation({ summary: 'Simulate a GPS movement step towards target coordinates' })
  async simulateStep(
    @CurrentUser('id') userId: string,
    @Body() body: { targetLat: number; targetLng: number; stepFraction?: number },
  ) {
    return this.agentsService.simulateMovementStep(
      userId,
      body.targetLat,
      body.targetLng,
      body.stepFraction,
    );
  }

  @Get('me/deliveries')
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT)
  @ApiOperation({ summary: 'Get all deliveries assigned to the current agent' })
  async getMyDeliveries(@CurrentUser('id') userId: string) {
    return this.agentsService.getAgentDeliveries(userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all agents with status, zone, vehicle, and search filters (Admin only)' })
  @ApiQuery({ name: 'status', required: false, enum: AgentStatus })
  @ApiQuery({ name: 'zoneId', required: false, type: String })
  @ApiQuery({ name: 'vehicleType', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getAllAgents(
    @Query('status') status?: AgentStatus,
    @Query('zoneId') zoneId?: string,
    @Query('vehicleType') vehicleType?: string,
    @Query('search') search?: string,
  ) {
    return this.agentsService.getAllAgents({ status, zoneId, vehicleType, search });
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get agent details by AgentProfile ID (Admin only)' })
  async getAgentById(@Param('id') id: string) {
    return this.agentsService.getAgentById(id);
  }

  @Patch(':userId/availability')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin override agent availability' })
  async adminUpdateAvailability(
    @Param('userId') userId: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.agentsService.updateAvailability(userId, dto);
  }
}
