import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { CreatePincodeDto } from './dto/create-pincode.dto';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllZones(includeInactive = false) {
    return this.prisma.zone.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        pincodes: true,
        _count: {
          select: {
            agents: true,
            pickupOrders: true,
            dropOrders: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getZoneById(id: string) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        pincodes: true,
        agents: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }

    return zone;
  }

  async createZone(dto: CreateZoneDto) {
    const existing = await this.prisma.zone.findUnique({
      where: { code: dto.code.toUpperCase().trim() },
    });

    if (existing) {
      throw new ConflictException(`Zone with code ${dto.code} already exists`);
    }

    return this.prisma.zone.create({
      data: {
        code: dto.code.toUpperCase().trim(),
        name: dto.name.trim(),
        city: dto.city.trim(),
        state: dto.state.trim(),
        description: dto.description,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: { pincodes: true },
    });
  }

  async updateZone(id: string, dto: UpdateZoneDto) {
    await this.getZoneById(id);

    return this.prisma.zone.update({
      where: { id },
      data: {
        ...(dto.code && { code: dto.code.toUpperCase().trim() }),
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.city && { city: dto.city.trim() }),
        ...(dto.state && { state: dto.state.trim() }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { pincodes: true },
    });
  }

  async deleteZone(id: string) {
    await this.getZoneById(id);
    return this.prisma.zone.delete({
      where: { id },
    });
  }

  async addPincodeToZone(zoneId: string, dto: CreatePincodeDto) {
    await this.getZoneById(zoneId);

    const existing = await this.prisma.zonePincode.findUnique({
      where: { pincode: dto.pincode.trim() },
    });

    if (existing) {
      throw new ConflictException(`Pincode ${dto.pincode} is already mapped to a zone`);
    }

    return this.prisma.zonePincode.create({
      data: {
        zoneId,
        pincode: dto.pincode.trim(),
        areaName: dto.areaName.trim(),
        lat: dto.lat,
        lng: dto.lng,
      },
    });
  }

  async removePincode(pincodeId: string) {
    const existing = await this.prisma.zonePincode.findUnique({
      where: { id: pincodeId },
    });

    if (!existing) {
      throw new NotFoundException(`Pincode record ${pincodeId} not found`);
    }

    return this.prisma.zonePincode.delete({
      where: { id: pincodeId },
    });
  }

  /**
   * Resolves a pincode to its corresponding Zone entity.
   * If the pincode is directly mapped, returns that zone.
   * If not found, falls back to the default active zone or creates a fallback zone mapping.
   */
  async resolveZoneByPincode(pincode: string) {
    const cleanPincode = pincode ? pincode.toString().trim() : '';

    if (!cleanPincode) {
      throw new NotFoundException('Pincode is required to resolve a zone');
    }

    const mapping = await this.prisma.zonePincode.findUnique({
      where: { pincode: cleanPincode },
      include: { zone: true },
    });

    if (mapping && mapping.zone && mapping.zone.isActive) {
      return {
        zone: mapping.zone,
        pincodeInfo: mapping,
        isFallback: false,
      };
    }

    // Fallback: Find first active zone (e.g. ZONE-CENTRAL or general hub)
    const fallbackZone = await this.prisma.zone.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!fallbackZone) {
      throw new NotFoundException('No active zones configured in the system');
    }

    return {
      zone: fallbackZone,
      pincodeInfo: {
        pincode: cleanPincode,
        areaName: `${fallbackZone.city} General Area`,
        lat: 12.9716,
        lng: 77.5946,
      },
      isFallback: true,
    };
  }
}
