import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ZonesService', () => {
  let service: ZonesService;
  let prismaService: any;

  const mockZone = {
    id: 'zone-1',
    code: 'ZONE-CENTRAL',
    name: 'Central Business District',
    city: 'Bengaluru',
    state: 'Karnataka',
    isActive: true,
  };

  const mockPincode = {
    id: 'pin-1',
    zoneId: 'zone-1',
    pincode: '560001',
    areaName: 'MG Road',
    lat: 12.9716,
    lng: 77.5946,
    zone: mockZone,
  };

  beforeEach(async () => {
    prismaService = {
      zone: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      zonePincode: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZonesService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ZonesService>(ZonesService);
  });

  describe('resolveZoneByPincode', () => {
    it('should resolve directly mapped pincode to its corresponding zone', async () => {
      prismaService.zonePincode.findUnique.mockResolvedValue(mockPincode);

      const result = await service.resolveZoneByPincode('560001');

      expect(result.zone.code).toBe('ZONE-CENTRAL');
      expect(result.isFallback).toBe(false);
      expect(result.pincodeInfo.areaName).toBe('MG Road');
    });

    it('should fall back to default active zone if pincode is unmapped', async () => {
      prismaService.zonePincode.findUnique.mockResolvedValue(null);
      prismaService.zone.findFirst.mockResolvedValue(mockZone);

      const result = await service.resolveZoneByPincode('560099');

      expect(result.zone.code).toBe('ZONE-CENTRAL');
      expect(result.isFallback).toBe(true);
    });

    it('should throw NotFoundException if no pincode is provided', async () => {
      await expect(service.resolveZoneByPincode('')).rejects.toThrow(NotFoundException);
    });
  });
});
