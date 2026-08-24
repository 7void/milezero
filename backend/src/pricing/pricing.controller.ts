import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { CalculateQuoteDto } from './dto/calculate-quote.dto';
import { CreateRateCardDto, UpdateRateCardDto, UpdateCodConfigDto } from './dto/create-rate-card.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Pricing & Rate Cards')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('quote')
  @ApiOperation({ summary: 'Calculate delivery price quote and transparent breakdown' })
  async calculateQuote(@Body() dto: CalculateQuoteDto) {
    return this.pricingService.calculateQuote(dto);
  }

  @Get('rate-cards')
  @ApiOperation({ summary: 'Get all configured rate cards' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async getRateCards(@Query('includeInactive') includeInactive?: boolean) {
    return this.pricingService.getAllRateCards(includeInactive);
  }

  @Get('rate-cards/:id')
  @ApiOperation({ summary: 'Get rate card by ID' })
  async getRateCardById(@Param('id') id: string) {
    return this.pricingService.getRateCardById(id);
  }

  @Post('rate-cards')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new rate card (Admin only)' })
  async createRateCard(@Body() dto: CreateRateCardDto) {
    return this.pricingService.createRateCard(dto);
  }

  @Put('rate-cards/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a rate card (Admin only)' })
  async updateRateCard(@Param('id') id: string, @Body() dto: UpdateRateCardDto) {
    return this.pricingService.updateRateCard(id, dto);
  }

  @Delete('rate-cards/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a rate card (Admin only)' })
  async deleteRateCard(@Param('id') id: string) {
    return this.pricingService.deleteRateCard(id);
  }

  @Get('cod-config')
  @ApiOperation({ summary: 'Get active COD surcharge configuration' })
  async getCodConfig() {
    return this.pricingService.getCodConfig();
  }

  @Put('cod-config/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update COD surcharge configuration (Admin only)' })
  async updateCodConfig(@Param('id') id: string, @Body() dto: UpdateCodConfigDto) {
    return this.pricingService.updateCodConfig(id, dto);
  }
}
