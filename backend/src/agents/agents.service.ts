import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { AgentStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllAgents(query?: {
    status?: AgentStatus;
    zoneId?: string;
    vehicleType?: string;
    search?: string;
  }) {
    const where: any = {
      ...(query?.status && { availabilityStatus: query.status }),
      ...(query?.zoneId && { currentZoneId: query.zoneId }),
      ...(query?.vehicleType && {
        vehicleType: { equals: query.vehicleType, mode: 'insensitive' },
      }),
    };

    if (query?.search) {
      const term = query.search.trim();
      where.OR = [
        { user: { name: { contains: term, mode: 'insensitive' } } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
        { user: { phone: { contains: term, mode: 'insensitive' } } },
        { vehicleType: { contains: term, mode: 'insensitive' } },
        { vehicleNumber: { contains: term, mode: 'insensitive' } },
      ];
    }

    return this.prisma.agentProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        currentZone: true,
        _count: {
          select: {
            assignedOrders: {
              where: {
                status: {
                  in: [
                    OrderStatus.ASSIGNED,
                    OrderStatus.PICKED_UP,
                    OrderStatus.IN_TRANSIT,
                    OrderStatus.OUT_FOR_DELIVERY,
                  ],
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getAgentProfileByUserId(userId: string) {
    const profile = await this.prisma.agentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        currentZone: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Agent profile not found');
    }

    return profile;
  }

  async getAgentById(id: string) {
    const profile = await this.prisma.agentProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        currentZone: true,
        assignedOrders: {
          where: {
            status: {
              in: [
                OrderStatus.ASSIGNED,
                OrderStatus.PICKED_UP,
                OrderStatus.IN_TRANSIT,
                OrderStatus.OUT_FOR_DELIVERY,
              ],
            },
          },
          include: {
            pickupAddress: true,
            dropAddress: true,
            pickupZone: true,
            dropZone: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    return profile;
  }

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
    const agent = await this.prisma.agentProfile.findUnique({ where: { userId } });
    if (!agent) {
      throw new NotFoundException('Agent profile not found');
    }

    return this.prisma.agentProfile.update({
      where: { userId },
      data: {
        availabilityStatus: dto.status,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        currentZone: true,
      },
    });
  }

  async updateLocation(userId: string, dto: UpdateLocationDto) {
    const agent = await this.prisma.agentProfile.findUnique({ where: { userId } });
    if (!agent) {
      throw new NotFoundException('Agent profile not found');
    }

    return this.prisma.agentProfile.update({
      where: { userId },
      data: {
        currentLat: dto.lat,
        currentLng: dto.lng,
        lastLocationUpdate: new Date(),
        ...(dto.zoneId && { currentZoneId: dto.zoneId }),
      },
      include: {
        user: { select: { id: true, name: true } },
        currentZone: true,
      },
    });
  }

  async getAgentDeliveries(userId: string) {
    const agent = await this.prisma.agentProfile.findUnique({ where: { userId } });
    if (!agent) {
      throw new NotFoundException('Agent profile not found');
    }

    return this.prisma.order.findMany({
      where: {
        agentId: agent.id,
      },
      include: {
        pickupAddress: true,
        dropAddress: true,
        pickupZone: true,
        dropZone: true,
        customer: { select: { id: true, name: true, phone: true, email: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        deliveryAttempts: { orderBy: { attemptedAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Helper for simulated GPS movement:
   * Interpolates coordinates along a line segment between (startLat, startLng) and (targetLat, targetLng) by fraction t in [0, 1].
   */
  async simulateMovementStep(userId: string, targetLat: number, targetLng: number, stepFraction = 0.25) {
    const agent = await this.prisma.agentProfile.findUnique({ where: { userId } });
    if (!agent || agent.currentLat === null || agent.currentLng === null) {
      return this.updateLocation(userId, { lat: targetLat, lng: targetLng });
    }

    const currentLat = agent.currentLat;
    const currentLng = agent.currentLng;

    const newLat = currentLat + (targetLat - currentLat) * stepFraction;
    const newLng = currentLng + (targetLng - currentLng) * stepFraction;

    return this.updateLocation(userId, {
      lat: Number(newLat.toFixed(6)),
      lng: Number(newLng.toFixed(6)),
    });
  }
}
