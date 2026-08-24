import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { CreatePincodeDto } from './dto/create-pincode.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Zones & Pincodes')
@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active zones with associated pincodes' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async getAllZones(@Query('includeInactive') includeInactive?: boolean) {
    return this.zonesService.getAllZones(includeInactive);
  }

  @Get('resolve')
  @ApiOperation({ summary: 'Resolve a pincode to its corresponding Zone' })
  @ApiQuery({ name: 'pincode', required: true, type: String })
  async resolveZone(@Query('pincode') pincode: string) {
    return this.zonesService.resolveZoneByPincode(pincode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get zone details by ID' })
  async getZoneById(@Param('id') id: string) {
    return this.zonesService.getZoneById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new zone (Admin only)' })
  async createZone(@Body() dto: CreateZoneDto) {
    return this.zonesService.createZone(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a zone (Admin only)' })
  async updateZone(@Param('id') id: string, @Body() dto: UpdateZoneDto) {
    return this.zonesService.updateZone(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a zone (Admin only)' })
  async deleteZone(@Param('id') id: string) {
    return this.zonesService.deleteZone(id);
  }

  @Post(':id/pincodes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a pincode mapping to a zone (Admin only)' })
  async addPincode(@Param('id') zoneId: string, @Body() dto: CreatePincodeDto) {
    return this.zonesService.addPincodeToZone(zoneId, dto);
  }

  @Delete('pincodes/:pincodeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a pincode mapping from a zone (Admin only)' })
  async removePincode(@Param('pincodeId') pincodeId: string) {
    return this.zonesService.removePincode(pincodeId);
  }
}
