import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, AgentStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOperationsMetrics() {
    const [
      totalOrders,
      ordersByStatus,
      agentsByStatus,
      totalRevenueResult,
      serviceTypeCounts,
      zoneOrderCounts,
      recentOrders,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.agentProfile.groupBy({
        by: ['availabilityStatus'],
        _count: { id: true },
      }),
      this.prisma.order.aggregate({
        _sum: { totalPrice: true },
        where: {
          status: { notIn: [OrderStatus.CANCELLED] },
        },
      }),
      this.prisma.order.groupBy({
        by: ['serviceType'],
        _count: { id: true },
      }),
      this.prisma.order.groupBy({
        by: ['pickupZoneId'],
        _count: { id: true },
      }),
      this.prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, email: true } },
          agent: { include: { user: { select: { name: true } } } },
          pickupZone: true,
          dropZone: true,
        },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const item of ordersByStatus) {
      statusMap[item.status] = item._count.id;
    }

    const agentMap: Record<string, number> = {
      [AgentStatus.AVAILABLE]: 0,
      [AgentStatus.BUSY]: 0,
      [AgentStatus.OFFLINE]: 0,
    };
    for (const item of agentsByStatus) {
      agentMap[item.availabilityStatus] = item._count.id;
    }

    const deliveredCount = statusMap[OrderStatus.DELIVERED] || 0;
    const failedCount = statusMap[OrderStatus.FAILED] || 0;
    const totalCompleted = deliveredCount + failedCount;
    const successRate = totalCompleted > 0 ? Number(((deliveredCount / totalCompleted) * 100).toFixed(1)) : 100;

    const activeDeliveries =
      (statusMap[OrderStatus.ASSIGNED] || 0) +
      (statusMap[OrderStatus.PICKED_UP] || 0) +
      (statusMap[OrderStatus.IN_TRANSIT] || 0) +
      (statusMap[OrderStatus.OUT_FOR_DELIVERY] || 0);

    return {
      overview: {
        totalOrders,
        activeDeliveries,
        deliveredCount,
        failedCount,
        successRate,
        totalRevenue: Number((totalRevenueResult._sum.totalPrice || 0).toFixed(2)),
        currency: 'INR',
      },
      statusBreakdown: statusMap,
      agentCapacity: {
        total: (agentMap.AVAILABLE || 0) + (agentMap.BUSY || 0) + (agentMap.OFFLINE || 0),
        available: agentMap.AVAILABLE || 0,
        busy: agentMap.BUSY || 0,
        offline: agentMap.OFFLINE || 0,
      },
      serviceTypeDistribution: serviceTypeCounts.reduce((acc, curr) => {
        acc[curr.serviceType] = curr._count.id;
        return acc;
      }, {}),
      recentActivity: recentOrders,
    };
  }

  async getFleetLiveOverview() {
    const [agents, activeOrders] = await Promise.all([
      this.prisma.agentProfile.findMany({
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
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
              customer: { select: { name: true, phone: true } },
            },
          },
        },
      }),
      this.prisma.order.findMany({
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
          agent: {
            include: { user: { select: { name: true, phone: true } } },
          },
        },
      }),
    ]);

    return {
      timestamp: new Date(),
      agents: agents.map((agent) => ({
        id: agent.id,
        userId: agent.userId,
        name: agent.user.name,
        phone: agent.user.phone,
        vehicleType: agent.vehicleType,
        vehicleNumber: agent.vehicleNumber,
        status: agent.availabilityStatus,
        location: {
          lat: agent.currentLat,
          lng: agent.currentLng,
          lastUpdated: agent.lastLocationUpdate,
        },
        zone: agent.currentZone ? { id: agent.currentZone.id, name: agent.currentZone.name } : null,
        activeOrdersCount: agent.assignedOrders.length,
        currentDeliveries: agent.assignedOrders,
      })),
      activeOrders: activeOrders.map((o) => ({
        id: o.id,
        trackingNumber: o.trackingNumber,
        status: o.status,
        serviceType: o.serviceType,
        paymentMode: o.paymentMode,
        totalPrice: o.totalPrice,
        pickup: {
          name: o.pickupAddress.contactName,
          pincode: o.pickupAddress.pincode,
          lat: o.pickupAddress.lat,
          lng: o.pickupAddress.lng,
          zone: o.pickupZone.name,
        },
        destination: {
          name: o.dropAddress.contactName,
          pincode: o.dropAddress.pincode,
          lat: o.dropAddress.lat,
          lng: o.dropAddress.lng,
          zone: o.dropZone.name,
        },
        agent: o.agent ? { name: o.agent.user.name, id: o.agent.id } : null,
      })),
    };
  }
}
