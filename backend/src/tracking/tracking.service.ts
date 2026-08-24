import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async getTrackingByNumber(trackingNumber: string) {
    const cleanNumber = trackingNumber ? trackingNumber.trim() : '';

    const order = await this.prisma.order.findUnique({
      where: { trackingNumber: cleanNumber },
      include: {
        pickupAddress: true,
        dropAddress: true,
        pickupZone: true,
        dropZone: true,
        agent: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
        deliveryAttempts: {
          orderBy: { attemptedAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Tracking information for #${cleanNumber} not found`);
    }

    return {
      trackingNumber: order.trackingNumber,
      status: order.status,
      serviceType: order.serviceType,
      paymentMode: order.paymentMode,
      totalPrice: order.totalPrice,
      packageDescription: order.packageDescription,
      actualWeightKg: order.actualWeightKg,
      volumetricWeightKg: order.volumetricWeightKg,
      billableWeightKg: order.billableWeightKg,
      pickup: {
        contactName: order.pickupAddress.contactName,
        city: order.pickupAddress.city,
        state: order.pickupAddress.state,
        pincode: order.pickupAddress.pincode,
        lat: order.pickupAddress.lat,
        lng: order.pickupAddress.lng,
        zone: order.pickupZone.name,
      },
      destination: {
        contactName: order.dropAddress.contactName,
        city: order.dropAddress.city,
        state: order.dropAddress.state,
        pincode: order.dropAddress.pincode,
        lat: order.dropAddress.lat,
        lng: order.dropAddress.lng,
        zone: order.dropZone.name,
      },
      assignedAgent: order.agent
        ? {
            id: order.agent.id,
            name: order.agent.user.name,
            phone: order.agent.user.phone,
            vehicleType: order.agent.vehicleType,
            vehicleNumber: order.agent.vehicleNumber,
            currentLat: order.agent.currentLat,
            currentLng: order.agent.currentLng,
            lastLocationUpdate: order.agent.lastLocationUpdate,
            availabilityStatus: order.agent.availabilityStatus,
          }
        : null,
      timeline: order.statusHistory.map((h) => ({
        id: h.id,
        status: h.status,
        actorRole: h.actorRole,
        actorName: h.actorName,
        notes: h.notes,
        locationLat: h.locationLat,
        locationLng: h.locationLng,
        timestamp: h.createdAt,
      })),
      deliveryAttempts: order.deliveryAttempts.map((a) => ({
        id: a.id,
        attemptNumber: a.attemptNumber,
        status: a.status,
        failureReason: a.failureReason,
        notes: a.notes,
        rescheduledFor: a.rescheduledFor,
        attemptedAt: a.attemptedAt,
      })),
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
      rescheduledDate: order.rescheduledDate,
    };
  }
}
