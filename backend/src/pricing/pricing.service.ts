import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ZonesService } from '../zones/zones.service';
import { CalculateQuoteDto } from './dto/calculate-quote.dto';
import { CreateRateCardDto, UpdateRateCardDto, UpdateCodConfigDto } from './dto/create-rate-card.dto';
import { ServiceType, PaymentMode, CodFeeType } from '@prisma/client';

export interface PriceBreakdown {
  pickupPincode: string;
  dropPincode: string;
  pickupZone: {
    id: string;
    code: string;
    name: string;
    city: string;
  };
  dropZone: {
    id: string;
    code: string;
    name: string;
    city: string;
  };
  isInterZone: boolean;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  actualWeightKg: number;
  volumetricWeightKg: number;
  billableWeightKg: number;
  rateCard: {
    id: string;
    code: string;
    name: string;
    serviceType: ServiceType;
    baseWeightKg: number;
    basePrice: number;
    perKgRate: number;
  };
  baseCharge: number;
  weightCharge: number;
  zoneAdjustmentCharge: number;
  codSurcharge: number;
  totalPrice: number;
  currency: string;
}

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly zonesService: ZonesService,
  ) {}

  /**
   * Calculates volumetric weight using standard logistics formula:
   * Volumetric Weight (kg) = (Length cm × Width cm × Height cm) / 5000
   */
  calculateVolumetricWeight(lengthCm: number, widthCm: number, heightCm: number): number {
    if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) {
      throw new BadRequestException('Package dimensions (L, W, H) must be greater than 0');
    }
    const rawWeight = (lengthCm * widthCm * heightCm) / 5000;
    return Number(rawWeight.toFixed(2));
  }

  /**
   * Authoritative dynamic pricing engine calculation:
   * 1. Determine pickup zone
   * 2. Determine drop zone
   * 3. Calculate volumetric weight (L*B*H/5000)
   * 4. Billable weight = max(actualWeight, volumetricWeight)
   * 5. Determine intra-zone vs inter-zone
   * 6. Match active B2B/B2C rate card
   * 7. Apply COD surcharge if applicable
   * 8. Return final charge and transparent breakdown
   */
  async calculateQuote(dto: CalculateQuoteDto): Promise<PriceBreakdown> {
    const [pickupResult, dropResult] = await Promise.all([
      this.zonesService.resolveZoneByPincode(dto.pickupPincode),
      this.zonesService.resolveZoneByPincode(dto.dropPincode),
    ]);

    const pickupZone = pickupResult.zone;
    const dropZone = dropResult.zone;

    const volumetricWeightKg = this.calculateVolumetricWeight(
      dto.lengthCm,
      dto.widthCm,
      dto.heightCm,
    );

    const actualWeightKg = Number(dto.actualWeightKg.toFixed(2));
    const billableWeightKg = Number(Math.max(actualWeightKg, volumetricWeightKg).toFixed(2));

    const isInterZone = pickupZone.id !== dropZone.id;

    const serviceType = dto.serviceType || ServiceType.B2C;
    const rateCard = await this.prisma.rateCard.findFirst({
      where: {
        serviceType,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!rateCard) {
      throw new NotFoundException(`No active rate card found for service type: ${serviceType}`);
    }

    const basePrice = isInterZone ? rateCard.basePriceInter : rateCard.basePriceIntra;
    const perKgRate = isInterZone ? rateCard.perKgRateInter : rateCard.perKgRateIntra;

    const baseCharge = Number(basePrice.toFixed(2));
    const excessWeight = Math.max(0, billableWeightKg - rateCard.baseWeightKg);
    const weightCharge = Number((excessWeight * perKgRate).toFixed(2));

    const subtotal = baseCharge + weightCharge;
    const chargeAfterMin = Math.max(subtotal, rateCard.minCharge || 0);

    let codSurcharge = 0;
    const paymentMode = dto.paymentMode || PaymentMode.PREPAID;

    if (paymentMode === PaymentMode.COD) {
      const codConfig = await this.prisma.codConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (codConfig) {
        if (codConfig.feeType === CodFeeType.FLAT) {
          codSurcharge = codConfig.flatFee || 40.0;
        } else if (codConfig.feeType === CodFeeType.PERCENTAGE) {
          const percentage = codConfig.percentageFee || 2.0;
          const basisAmount = dto.orderValue && dto.orderValue > 0 ? dto.orderValue : chargeAfterMin;
          let calculatedFee = (basisAmount * percentage) / 100;
          if (codConfig.minFee && calculatedFee < codConfig.minFee) {
            calculatedFee = codConfig.minFee;
          }
          if (codConfig.maxFee && calculatedFee > codConfig.maxFee) {
            calculatedFee = codConfig.maxFee;
          }
          codSurcharge = Number(calculatedFee.toFixed(2));
        }
      } else {
        codSurcharge = 35.0;
      }
    }

    const totalPrice = Number((chargeAfterMin + codSurcharge).toFixed(2));

    return {
      pickupPincode: dto.pickupPincode,
      dropPincode: dto.dropPincode,
      pickupZone: {
        id: pickupZone.id,
        code: pickupZone.code,
        name: pickupZone.name,
        city: pickupZone.city,
      },
      dropZone: {
        id: dropZone.id,
        code: dropZone.code,
        name: dropZone.name,
        city: dropZone.city,
      },
      isInterZone,
      lengthCm: dto.lengthCm,
      widthCm: dto.widthCm,
      heightCm: dto.heightCm,
      actualWeightKg,
      volumetricWeightKg,
      billableWeightKg,
      rateCard: {
        id: rateCard.id,
        code: rateCard.code,
        name: rateCard.name,
        serviceType: rateCard.serviceType,
        baseWeightKg: rateCard.baseWeightKg,
        basePrice,
        perKgRate,
      },
      baseCharge,
      weightCharge,
      zoneAdjustmentCharge: 0,
      codSurcharge,
      totalPrice,
      currency: 'INR',
    };
  }

  async getAllRateCards(includeInactive = false) {
    return this.prisma.rateCard.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ serviceType: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getRateCardById(id: string) {
    const rateCard = await this.prisma.rateCard.findUnique({ where: { id } });
    if (!rateCard) {
      throw new NotFoundException(`Rate card with ID ${id} not found`);
    }
    return rateCard;
  }

  async createRateCard(dto: CreateRateCardDto) {
    return this.prisma.rateCard.create({
      data: {
        code: dto.code.toUpperCase().trim(),
        name: dto.name.trim(),
        serviceType: dto.serviceType,
        baseWeightKg: dto.baseWeightKg,
        basePriceIntra: dto.basePriceIntra,
        basePriceInter: dto.basePriceInter,
        perKgRateIntra: dto.perKgRateIntra,
        perKgRateInter: dto.perKgRateInter,
        minCharge: dto.minCharge || 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        description: dto.description,
      },
    });
  }

  async updateRateCard(id: string, dto: UpdateRateCardDto) {
    await this.getRateCardById(id);
    return this.prisma.rateCard.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.serviceType && { serviceType: dto.serviceType }),
        ...(dto.baseWeightKg !== undefined && { baseWeightKg: dto.baseWeightKg }),
        ...(dto.basePriceIntra !== undefined && { basePriceIntra: dto.basePriceIntra }),
        ...(dto.basePriceInter !== undefined && { basePriceInter: dto.basePriceInter }),
        ...(dto.perKgRateIntra !== undefined && { perKgRateIntra: dto.perKgRateIntra }),
        ...(dto.perKgRateInter !== undefined && { perKgRateInter: dto.perKgRateInter }),
        ...(dto.minCharge !== undefined && { minCharge: dto.minCharge }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  async deleteRateCard(id: string) {
    await this.getRateCardById(id);
    return this.prisma.rateCard.delete({ where: { id } });
  }

  async getCodConfig() {
    let config = await this.prisma.codConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!config) {
      config = await this.prisma.codConfig.create({
        data: {
          name: 'Default COD Surcharge',
          feeType: CodFeeType.PERCENTAGE,
          percentageFee: 2.0,
          flatFee: 40.0,
          minFee: 30.0,
          maxFee: 500.0,
          isActive: true,
        },
      });
    }

    return config;
  }

  async updateCodConfig(id: string, dto: UpdateCodConfigDto) {
    return this.prisma.codConfig.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.feeType && { feeType: dto.feeType }),
        ...(dto.flatFee !== undefined && { flatFee: dto.flatFee }),
        ...(dto.percentageFee !== undefined && { percentageFee: dto.percentageFee }),
        ...(dto.minFee !== undefined && { minFee: dto.minFee }),
        ...(dto.maxFee !== undefined && { maxFee: dto.maxFee }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }
}
