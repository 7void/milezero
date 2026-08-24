import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ManualAssignDto } from './dto/manual-assign.dto';
import { AgentStatus, OrderStatus } from '@prisma/client';

export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Manual Assignment of an order to an agent by Admin
   */
  async assignManually(dto: ManualAssignDto, adminUser?: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        customer: true,
        pickupAddress: true,
        dropAddress: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
    }

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.RESCHEDULED &&
      order.status !== OrderStatus.ASSIGNED
    ) {
      throw new BadRequestException(
        `Cannot reassign order in status ${order.status}. Only PENDING, RESCHEDULED, or ASSIGNED orders can be assigned.`,
      );
    }

    const agent = await this.prisma.agentProfile.findUnique({
      where: { id: dto.agentId },
      include: { user: true },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${dto.agentId} not found`);
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id: dto.orderId },
        data: {
          agentId: agent.id,
          status: OrderStatus.ASSIGNED,
        },
        include: {
          agent: { include: { user: true } },
          customer: true,
          pickupAddress: true,
          dropAddress: true,
        },
      });

      await tx.agentProfile.update({
        where: { id: agent.id },
        data: { availabilityStatus: AgentStatus.BUSY },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.ASSIGNED,
          actorId: adminUser?.id || null,
          actorRole: 'ADMIN',
          actorName: adminUser?.name || 'Admin Operations',
          notes: dto.notes || `Manually assigned to agent ${agent.user.name}`,
          locationLat: agent.currentLat,
          locationLng: agent.currentLng,
        },
      });

      return ord;
    });

    await this.notificationsService.send({
      userId: agent.userId,
      orderId: order.id,
      title: 'New Delivery Assigned',
      message: `You have been assigned order #${order.trackingNumber} for pickup at ${order.pickupAddress.street}, ${order.pickupAddress.city}.`,
      type: 'AGENT_ASSIGNED',
      channel: 'IN_APP',
      recipientPhone: agent.user.phone || undefined,
    });

    await this.notificationsService.send({
      userId: order.customerId,
      orderId: order.id,
      title: 'Delivery Agent Assigned',
      message: `Agent ${agent.user.name} has been assigned to your delivery #${order.trackingNumber}.`,
      type: 'AGENT_ASSIGNED',
      channel: 'IN_APP',
      recipientEmail: order.customer.email,
    });

    return updatedOrder;
  }

  /**
   * Automatic intelligent assignment:
   * 1. Finds all available agents (status = AVAILABLE)
   * 2. Computes distance using Haversine formula to pickup coordinates
   * 3. Uses zone fallback if coordinates are unavailable
   * 4. Assigns nearest agent and updates availability to BUSY
   */
  async autoAssignOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        pickupAddress: true,
        dropAddress: true,
        pickupZone: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.RESCHEDULED
    ) {
      throw new BadRequestException(
        `Cannot auto-assign order in status ${order.status}. Order must be PENDING or RESCHEDULED.`,
      );
    }

    const availableAgents = await this.prisma.agentProfile.findMany({
      where: { availabilityStatus: AgentStatus.AVAILABLE },
      include: { user: true, currentZone: true },
    });

    if (availableAgents.length === 0) {
      this.logger.warn(`No available agents found for auto-assignment of order ${order.trackingNumber}`);
      return {
        assigned: false,
        message: 'No available agents online at this moment. Order remains in queue.',
        order,
      };
    }

    let selectedAgent = null;
    let distanceKm: number | null = null;

    const pickupLat = order.pickupAddress.lat;
    const pickupLng = order.pickupAddress.lng;

    if (pickupLat !== null && pickupLng !== null) {
      const scoredAgents = availableAgents
        .filter((a) => a.currentLat !== null && a.currentLng !== null)
        .map((a) => {
          const dist = calculateHaversineDistanceKm(
            a.currentLat!,
            a.currentLng!,
            pickupLat,
            pickupLng,
          );
          return { agent: a, distanceKm: dist };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm);

      if (scoredAgents.length > 0) {
        selectedAgent = scoredAgents[0].agent;
        distanceKm = scoredAgents[0].distanceKm;
      }
    }

    if (!selectedAgent) {
      const zoneAgents = availableAgents.filter(
        (a) => a.currentZoneId === order.pickupZoneId,
      );

      if (zoneAgents.length > 0) {
        selectedAgent = zoneAgents[0];
      } else {
        selectedAgent = availableAgents[0];
      }
    }

    const finalAgent = selectedAgent;
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id: order.id },
        data: {
          agentId: finalAgent.id,
          status: OrderStatus.ASSIGNED,
        },
        include: {
          agent: { include: { user: true } },
          customer: true,
          pickupAddress: true,
          dropAddress: true,
        },
      });

      await tx.agentProfile.update({
        where: { id: finalAgent.id },
        data: { availabilityStatus: AgentStatus.BUSY },
      });

      const distNote = distanceKm !== null ? ` (Proximity: ${distanceKm} km away)` : ' (Zone match)';
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.ASSIGNED,
          actorRole: 'SYSTEM',
          actorName: 'MileZero Auto-Dispatch Engine',
          notes: `Automatically assigned nearest agent ${finalAgent.user.name}${distNote}`,
          locationLat: finalAgent.currentLat,
          locationLng: finalAgent.currentLng,
        },
      });

      return ord;
    });

    await this.notificationsService.send({
      userId: finalAgent.userId,
      orderId: order.id,
      title: 'New Auto-Assigned Delivery',
      message: `You have been assigned order #${order.trackingNumber} for pickup at ${order.pickupAddress.street}, ${order.pickupAddress.city}.`,
      type: 'AGENT_ASSIGNED',
      channel: 'IN_APP',
    });

    await this.notificationsService.send({
      userId: order.customerId,
      orderId: order.id,
      title: 'Agent Assigned to Your Order',
      message: `Agent ${finalAgent.user.name} has been assigned to deliver order #${order.trackingNumber}.`,
      type: 'AGENT_ASSIGNED',
      channel: 'IN_APP',
    });

    return {
      assigned: true,
      agent: finalAgent,
      distanceKm,
      order: updatedOrder,
    };
  }

  /**
   * Batch Auto-Assign all pending or rescheduled orders
   */
  async autoAssignAllPending() {
    const pendingOrders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PENDING, OrderStatus.RESCHEDULED] },
      },
      orderBy: { createdAt: 'asc' },
    });

    const results = [];
    for (const order of pendingOrders) {
      try {
        const res = await this.autoAssignOrder(order.id);
        results.push({ orderId: order.id, trackingNumber: order.trackingNumber, result: res });
      } catch (err) {
        results.push({
          orderId: order.id,
          trackingNumber: order.trackingNumber,
          error: err.message,
        });
      }
    }

    return {
      totalProcessed: pendingOrders.length,
      assignedCount: results.filter((r) => r.result?.assigned).length,
      results,
    };
  }
}
