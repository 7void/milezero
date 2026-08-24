import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { ZonesService } from '../zones/zones.service';
import { ServiceType, PaymentMode, CodFeeType } from '@prisma/client';

describe('PricingService', () => {
  let service: PricingService;
  let prismaService: any;
  let zonesService: any;

  const mockCentralZone = {
    id: 'zone-1',
    code: 'ZONE-CENTRAL',
    name: 'Central Hub',
    city: 'Bengaluru',
    state: 'Karnataka',
    isActive: true,
  };

  const mockNorthZone = {
    id: 'zone-2',
    code: 'ZONE-NORTH',
    name: 'North Metro',
    city: 'Bengaluru',
    state: 'Karnataka',
    isActive: true,
  };

  const mockB2CRateCard = {
    id: 'rc-b2c',
    code: 'B2C-STD',
    name: 'B2C Standard',
    serviceType: ServiceType.B2C,
    baseWeightKg: 1.0,
    basePriceIntra: 40.0,
    basePriceInter: 70.0,
    perKgRateIntra: 20.0,
    perKgRateInter: 35.0,
    minCharge: 40.0,
    isActive: true,
  };

  const mockB2BRateCard = {
    id: 'rc-b2b',
    code: 'B2B-EXP',
    name: 'B2B Express',
    serviceType: ServiceType.B2B,
    baseWeightKg: 5.0,
    basePriceIntra: 120.0,
    basePriceInter: 200.0,
    perKgRateIntra: 15.0,
    perKgRateInter: 25.0,
    minCharge: 120.0,
    isActive: true,
  };

  const mockCodConfig = {
    id: 'cod-1',
    name: 'Standard COD',
    feeType: CodFeeType.PERCENTAGE,
    percentageFee: 2.0,
    flatFee: 40.0,
    minFee: 30.0,
    maxFee: 500.0,
    isActive: true,
  };

  beforeEach(async () => {
    prismaService = {
      rateCard: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      codConfig: {
        findFirst: jest.fn().mockResolvedValue(mockCodConfig),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    zonesService = {
      resolveZoneByPincode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: prismaService },
        { provide: ZonesService, useValue: zonesService },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  describe('calculateVolumetricWeight', () => {
    it('should calculate volumetric weight using (L*W*H)/5000 accurately', () => {
      // 30 * 20 * 15 / 5000 = 9000 / 5000 = 1.8 kg
      const result = service.calculateVolumetricWeight(30, 20, 15);
      expect(result).toBe(1.8);
    });

    it('should throw BadRequestException if dimensions are 0 or negative', () => {
      expect(() => service.calculateVolumetricWeight(0, 20, 15)).toThrow(BadRequestException);
      expect(() => service.calculateVolumetricWeight(30, -5, 15)).toThrow(BadRequestException);
    });
  });

  describe('calculateQuote - Billable Weight Selection', () => {
    it('should use volumetric weight when volumetric exceeds actual weight (Bulky Item)', async () => {
      // 50 * 40 * 30 / 5000 = 60000 / 5000 = 12.0 kg. Actual = 3.0 kg.
      zonesService.resolveZoneByPincode
        .mockResolvedValueOnce({ zone: mockCentralZone, isFallback: false })
        .mockResolvedValueOnce({ zone: mockCentralZone, isFallback: false });

      prismaService.rateCard.findFirst.mockResolvedValue(mockB2CRateCard);

      const quote = await service.calculateQuote({
        pickupPincode: '560001',
        dropPincode: '560002',
        lengthCm: 50,
        widthCm: 40,
        heightCm: 30,
        actualWeightKg: 3.0,
        serviceType: ServiceType.B2C,
        paymentMode: PaymentMode.PREPAID,
      });

      expect(quote.volumetricWeightKg).toBe(12.0);
      expect(quote.actualWeightKg).toBe(3.0);
      expect(quote.billableWeightKg).toBe(12.0);
      // Intra-zone: Base 40 (covers 1kg) + 11kg excess * 20 = 40 + 220 = 260
      expect(quote.baseCharge).toBe(40.0);
      expect(quote.weightCharge).toBe(220.0);
      expect(quote.codSurcharge).toBe(0);
      expect(quote.totalPrice).toBe(260.0);
    });

    it('should use actual weight when actual exceeds volumetric weight (Dense Item)', async () => {
      // 10 * 10 * 10 / 5000 = 0.2 kg. Actual = 5.0 kg.
      zonesService.resolveZoneByPincode
        .mockResolvedValueOnce({ zone: mockCentralZone, isFallback: false })
        .mockResolvedValueOnce({ zone: mockCentralZone, isFallback: false });

      prismaService.rateCard.findFirst.mockResolvedValue(mockB2CRateCard);

      const quote = await service.calculateQuote({
        pickupPincode: '560001',
        dropPincode: '560002',
        lengthCm: 10,
        widthCm: 10,
        heightCm: 10,
        actualWeightKg: 5.0,
        serviceType: ServiceType.B2C,
        paymentMode: PaymentMode.PREPAID,
      });

      expect(quote.volumetricWeightKg).toBe(0.2);
      expect(quote.actualWeightKg).toBe(5.0);
      expect(quote.billableWeightKg).toBe(5.0);
      // Base 40 (1kg) + 4kg excess * 20 = 40 + 80 = 120
      expect(quote.totalPrice).toBe(120.0);
    });
  });

  describe('calculateQuote - Intra vs Inter Zone Pricing', () => {
    it('should apply intra-zone rates when pickup and drop zones match', async () => {
      zonesService.resolveZoneByPincode
        .mockResolvedValueOnce({ zone: mockCentralZone, isFallback: false })
        .mockResolvedValueOnce({ zone: mockCentralZone, isFallback: false });

      prismaService.rateCard.findFirst.mockResolvedValue(mockB2CRateCard);

      const quote = await service.calculateQuote({
        pickupPincode: '560001',
        dropPincode: '560025',
        lengthCm: 20,
        widthCm: 15,
        heightCm: 10,
        actualWeightKg: 2.0,
        serviceType: ServiceType.B2C,
        paymentMode: PaymentMode.PREPAID,
      });

      expect(quote.isInterZone).toBe(false);
      expect(quote.baseCharge).toBe(40.0); // Base intra
      // Excess: 2.0 - 1.0 = 1.0kg * 20 = 20. Total = 60
      expect(quote.weightCharge).toBe(20.0);
      expect(quote.totalPrice).toBe(60.0);
    });

    it('should apply inter-zone rates when pickup and drop zones differ', async () => {
      zonesService.resolveZoneByPincode
        .mockResolvedValueOnce({ zone: mockCentralZone, isFallback: false })
        .mockResolvedValueOnce({ zone: mockNorthZone, isFallback: false });

      prismaService.rateCard.findFirst.mockResolvedValue(mockB2CRateCard);

      const quote = await service.calculateQuote({
        pickupPincode: '560001',
        dropPincode: '560064',
        lengthCm: 20,
        widthCm: 15,
        heightCm: 10,
        actualWeightKg: 2.0,
        serviceType: ServiceType.B2C,
        paymentMode: PaymentMode.PREPAID,
      });

      expect(quote.isInterZone).toBe(true);
      expect(quote.baseCharge).toBe(70.0); // Base inter
      // Excess: 2.0 - 1.0 = 1.0kg * 35 = 35. Total = 105
      expect(quote.weightCharge).toBe(35.0);
      expect(quote.totalPrice).toBe(105.0);
    });
  });

  describe('calculateQuote - B2B Rate Card', () => {
    it('should apply B2B rate card with 5kg base weight threshold', async () => {
      zonesService.resolveZoneByPincode
        .mockResolvedValueOnce({ zone: mockCentralZone, isFallback: false })
        .mockResolvedValueOnce({ zone: mockNorthZone, isFallback: false });

      prismaService.rateCard.findFirst.mockResolvedValue(mockB2BRateCard);

      const quote = await service.calculateQuote({
        pickupPincode: '560001',
        dropPincode: '560064',
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20, // 24000 / 5000 = 4.8kg
        actualWeightKg: 8.0,
        serviceType: ServiceType.B2B,
        paymentMode: PaymentMode.PREPAID,
      });

      expect(quote.rateCard.serviceType).toBe(ServiceType.B2B);
      expect(quote.billableWeightKg).toBe(8.0);
      expect(quote.baseCharge).toBe(200.0); // Inter-zone B2B base
      // Excess: 8.0 - 5.0 = 3.0kg * 25 = 75. Total = 275
      expect(quote.weightCharge).toBe(75.0);
      expect(quote.totalPrice).toBe(275.0);
    });
  });

  describe('calculateQuote - COD Surcharge', () => {
    it('should calculate and apply COD surcharge when paymentMode is COD', async () => {
      zonesService.resolveZoneByPincode
        .mockResolvedValueOnce({ zone: mockCentralZone, isFallback: false })
        .mockResolvedValueOnce({ zone: mockCentralZone, isFallback: false });

      prismaService.rateCard.findFirst.mockResolvedValue(mockB2CRateCard);

      const quote = await service.calculateQuote({
        pickupPincode: '560001',
        dropPincode: '560002',
        lengthCm: 20,
        widthCm: 15,
        heightCm: 10,
        actualWeightKg: 1.0,
        serviceType: ServiceType.B2C,
        paymentMode: PaymentMode.COD,
        orderValue: 2000,
      });

      // Delivery charge = 40. COD on 2000 at 2% = 40 (min is 30, max 500). Total = 80
      expect(quote.codSurcharge).toBe(40.0);
      expect(quote.totalPrice).toBe(80.0);
    });

    it('should respect minimum COD surcharge bound', async () => {
      zonesService.resolveZoneByPincode
        .mockResolvedValueOnce({ zone: mockCentralZone, isFallback: false })
        .mockResolvedValueOnce({ zone: mockCentralZone, isFallback: false });

      prismaService.rateCard.findFirst.mockResolvedValue(mockB2CRateCard);

      const quote = await service.calculateQuote({
        pickupPincode: '560001',
        dropPincode: '560002',
        lengthCm: 20,
        widthCm: 15,
        heightCm: 10,
        actualWeightKg: 1.0,
        serviceType: ServiceType.B2C,
        paymentMode: PaymentMode.COD,
        orderValue: 500, // 2% of 500 = 10, but minFee is 30
      });

      expect(quote.codSurcharge).toBe(30.0);
      expect(quote.totalPrice).toBe(70.0);
    });

    it('should pick service-type specific COD rule over global fallback', async () => {
      zonesService.resolveZoneByPincode
        .mockResolvedValueOnce({ zone: mockCentralZone, isFallback: false })
        .mockResolvedValueOnce({ zone: mockCentralZone, isFallback: false });

      const b2bCodConfig = {
        id: 'cod-b2b',
        name: 'B2B Flat COD',
        serviceType: ServiceType.B2B,
        feeType: CodFeeType.FLAT,
        flatFee: 75.0,
        isActive: true,
      };

      prismaService.rateCard.findFirst.mockResolvedValue(mockB2BRateCard);
      prismaService.codConfig.findFirst.mockResolvedValue(b2bCodConfig);

      const quote = await service.calculateQuote({
        pickupPincode: '560001',
        dropPincode: '560002',
        lengthCm: 20,
        widthCm: 15,
        heightCm: 10,
        actualWeightKg: 5.0,
        serviceType: ServiceType.B2B,
        paymentMode: PaymentMode.COD,
      });

      expect(quote.codSurcharge).toBe(75.0);
    });

    it('should fetch all COD configs with includeInactive option', async () => {
      prismaService.codConfig.findMany = jest.fn().mockResolvedValue([mockCodConfig]);
      const result = await service.getAllCodConfigs(true);
      expect(prismaService.codConfig.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ serviceType: 'asc' }, { createdAt: 'desc' }],
      });
      expect(result).toHaveLength(1);
    });
  });
});
