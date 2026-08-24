import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AssignmentService } from '../assignment/assignment.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto, RescheduleOrderDto, AdminOverrideDto } from './dto/update-status.dto';
import { OrderStatus, Role, AgentStatus, AttemptStatus } from '@prisma/client';

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
  [OrderStatus.ASSIGNED]: [
    OrderStatus.PICKED_UP,
    OrderStatus.FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PICKED_UP]: [
    OrderStatus.IN_TRANSIT,
    OrderStatus.FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.IN_TRANSIT]: [
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.OUT_FOR_DELIVERY]: [
    OrderStatus.DELIVERED,
    OrderStatus.FAILED,
  ],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.FAILED]: [
    OrderStatus.RESCHEDULED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.RESCHEDULED]: [
    OrderStatus.ASSIGNED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => AssignmentService))
    private readonly assignmentService: AssignmentService,
  ) {}

  private generateTrackingNumber(): string {
    const year = new Date().getFullYear();
    const randomHex = Math.floor(100000 + Math.random() * 900000);
    return `MZ-${year}-${randomHex}`;
  }

  async createOrder(dto: CreateOrderDto, currentUser: any) {
    let customerId = currentUser.id;
    if (currentUser.role === Role.ADMIN && dto.customerId) {
      customerId = dto.customerId;
    }

    const customer = await this.prisma.user.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundException(`Customer user with ID ${customerId} not found`);
    }

    const quote = await this.pricingService.calculateQuote({
      pickupPincode: dto.pickupAddress.pincode,
      dropPincode: dto.dropAddress.pincode,
      lengthCm: dto.lengthCm,
      widthCm: dto.widthCm,
      heightCm: dto.heightCm,
      actualWeightKg: dto.actualWeightKg,
      serviceType: dto.serviceType,
      paymentMode: dto.paymentMode,
    });

    const trackingNumber = this.generateTrackingNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      const pickupAddress = await tx.address.create({
        data: {
          userId: customerId,
          contactName: dto.pickupAddress.contactName,
          phone: dto.pickupAddress.phone,
          email: dto.pickupAddress.email,
          street: dto.pickupAddress.street,
          apartment: dto.pickupAddress.apartment,
          city: dto.pickupAddress.city,
          state: dto.pickupAddress.state,
          pincode: dto.pickupAddress.pincode.trim(),
          lat: dto.pickupAddress.lat || 12.9716,
          lng: dto.pickupAddress.lng || 77.5946,
          zoneId: quote.pickupZone.id,
        },
      });

      const dropAddress = await tx.address.create({
        data: {
          userId: customerId,
          contactName: dto.dropAddress.contactName,
          phone: dto.dropAddress.phone,
          email: dto.dropAddress.email,
          street: dto.dropAddress.street,
          apartment: dto.dropAddress.apartment,
          city: dto.dropAddress.city,
          state: dto.dropAddress.state,
          pincode: dto.dropAddress.pincode.trim(),
          lat: dto.dropAddress.lat || 12.9352,
          lng: dto.dropAddress.lng || 77.6245,
          zoneId: quote.dropZone.id,
        },
      });

      const newOrder = await tx.order.create({
        data: {
          trackingNumber,
          customerId,
          serviceType: dto.serviceType || 'B2C',
          paymentMode: dto.paymentMode || 'PREPAID',
          status: OrderStatus.PENDING,
          packageDescription: dto.packageDescription,
          packageCategory: dto.packageCategory || 'General Goods',
          lengthCm: dto.lengthCm,
          widthCm: dto.widthCm,
          heightCm: dto.heightCm,
          actualWeightKg: quote.actualWeightKg,
          volumetricWeightKg: quote.volumetricWeightKg,
          billableWeightKg: quote.billableWeightKg,
          pickupAddressId: pickupAddress.id,
          dropAddressId: dropAddress.id,
          pickupZoneId: quote.pickupZone.id,
          dropZoneId: quote.dropZone.id,
          isInterZone: quote.isInterZone,
          rateCardId: quote.rateCard.id,
          baseCharge: quote.baseCharge,
          weightCharge: quote.weightCharge,
          zoneAdjustmentCharge: quote.zoneAdjustmentCharge,
          codSurcharge: quote.codSurcharge,
          totalPrice: quote.totalPrice,
          specialInstructions: dto.specialInstructions,
        },
        include: {
          pickupAddress: true,
          dropAddress: true,
          pickupZone: true,
          dropZone: true,
          rateCard: true,
          customer: { select: { id: true, name: true, email: true, phone: true } },
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          status: OrderStatus.PENDING,
          actorId: currentUser.id,
          actorRole: currentUser.role,
          actorName: currentUser.name || 'Customer',
          notes: 'Order placed and booking confirmed',
          locationLat: pickupAddress.lat,
          locationLng: pickupAddress.lng,
        },
      });

      return newOrder;
    });

    await this.notificationsService.send({
      userId: customerId,
      orderId: order.id,
      title: 'Order Confirmed',
      message: `Your order #${order.trackingNumber} has been received and is queued for pickup dispatch.`,
      type: 'ORDER_CREATED',
      channel: 'IN_APP',
      recipientEmail: customer.email,
    });

    if (dto.autoAssign !== false) {
      try {
        await this.assignmentService.autoAssignOrder(order.id);
      } catch (err) {
        this.logger.warn(`Immediate auto-assign for order ${order.id} deferred: ${err.message}`);
      }
    }

    return this.getOrderById(order.id, currentUser);
  }

  async getAllOrders(
    query: {
      status?: OrderStatus;
      zoneId?: string;
      customerId?: string;
      agentId?: string;
      search?: string;
      serviceType?: string;
      paymentMode?: string;
    },
    currentUser: any,
  ) {
    const where: any = {};

    if (currentUser.role === Role.CUSTOMER) {
      where.customerId = currentUser.id;
    } else if (currentUser.role === Role.AGENT) {
      const agent = await this.prisma.agentProfile.findUnique({
        where: { userId: currentUser.id },
      });
      if (!agent) {
        return [];
      }
      where.agentId = agent.id;
    } else {
      if (query.customerId) where.customerId = query.customerId;
      if (query.agentId) where.agentId = query.agentId;
    }

    if (query.status) where.status = query.status;
    if (query.zoneId) {
      where.OR = [{ pickupZoneId: query.zoneId }, { dropZoneId: query.zoneId }];
    }
    if (query.serviceType) where.serviceType = query.serviceType;
    if (query.paymentMode) where.paymentMode = query.paymentMode;

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { trackingNumber: { contains: term, mode: 'insensitive' } },
        { packageDescription: { contains: term, mode: 'insensitive' } },
        { pickupAddress: { contactName: { contains: term, mode: 'insensitive' } } },
        { dropAddress: { contactName: { contains: term, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.order.findMany({
      where,
      include: {
        pickupAddress: true,
        dropAddress: true,
        pickupZone: true,
        dropZone: true,
        rateCard: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
        agent: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(id: string, currentUser?: any) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        pickupAddress: true,
        dropAddress: true,
        pickupZone: true,
        dropZone: true,
        rateCard: true,
        codConfig: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
        agent: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
            currentZone: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: {
            actor: { select: { id: true, name: true, role: true } },
          },
        },
        deliveryAttempts: {
          orderBy: { attemptedAt: 'desc' },
          include: {
            agent: {
              include: { user: { select: { id: true, name: true, phone: true } } },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (currentUser) {
      if (currentUser.role === Role.CUSTOMER && order.customerId !== currentUser.id) {
        throw new ForbiddenException('Access denied: You can only view your own orders');
      }
      if (currentUser.role === Role.AGENT) {
        const agent = await this.prisma.agentProfile.findUnique({
          where: { userId: currentUser.id },
        });
        if (!agent || order.agentId !== agent.id) {
          throw new ForbiddenException('Access denied: This delivery is not assigned to you');
        }
      }
    }

    return order;
  }

  async getOrderByTrackingNumber(trackingNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { trackingNumber: trackingNumber.trim() },
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
      throw new NotFoundException(`Order with tracking number ${trackingNumber} not found`);
    }

    return order;
  }

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto, currentUser: any) {
    const order = await this.getOrderById(id);

    let agentProfile = null;
    if (currentUser.role === Role.AGENT) {
      agentProfile = await this.prisma.agentProfile.findUnique({
        where: { userId: currentUser.id },
      });
      if (!agentProfile || order.agentId !== agentProfile.id) {
        throw new ForbiddenException('You can only update status for orders assigned to you');
      }
    }

    const allowed = ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid state transition: Cannot change status from "${order.status}" to "${dto.status}". Allowed next states are: [${allowed.join(', ')}].`,
      );
    }

    if (dto.status === OrderStatus.FAILED && !dto.failureReason) {
      throw new BadRequestException('A failure reason is mandatory when marking delivery as FAILED');
    }

    const currentAttemptsCount = await this.prisma.deliveryAttempt.count({
      where: { orderId: order.id },
    });

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const dataToUpdate: any = {
        status: dto.status,
      };

      if (dto.status === OrderStatus.DELIVERED) {
        dataToUpdate.deliveredAt = new Date();
      }

      const ord = await tx.order.update({
        where: { id: order.id },
        data: dataToUpdate,
      });

      if (dto.status === OrderStatus.FAILED) {
        await tx.deliveryAttempt.create({
          data: {
            orderId: order.id,
            attemptNumber: currentAttemptsCount + 1,
            agentId: order.agentId,
            status: AttemptStatus.FAILED,
            failureReason: dto.failureReason || 'Delivery Failed',
            notes: dto.notes,
          },
        });

        if (order.agentId) {
          await tx.agentProfile.update({
            where: { id: order.agentId },
            data: { availabilityStatus: AgentStatus.AVAILABLE },
          });
        }
      }

      if (dto.status === OrderStatus.DELIVERED && order.agentId) {
        await tx.agentProfile.update({
          where: { id: order.agentId },
          data: { availabilityStatus: AgentStatus.AVAILABLE },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: dto.status,
          actorId: currentUser.id,
          actorRole: currentUser.role,
          actorName: currentUser.name || 'Delivery Agent',
          notes: dto.notes || (dto.failureReason ? `Failed: ${dto.failureReason}` : `Status updated to ${dto.status}`),
          locationLat: dto.lat || agentProfile?.currentLat || null,
          locationLng: dto.lng || agentProfile?.currentLng || null,
        },
      });

      return ord;
    });

    const notifMessages: Record<OrderStatus, { title: string; msg: string }> = {
      [OrderStatus.PENDING]: { title: 'Order Pending', msg: `Order #${order.trackingNumber} is pending dispatch.` },
      [OrderStatus.ASSIGNED]: { title: 'Agent Assigned', msg: `Agent has been assigned to order #${order.trackingNumber}.` },
      [OrderStatus.PICKED_UP]: { title: 'Package Picked Up', msg: `Your package #${order.trackingNumber} has been picked up by the delivery agent.` },
      [OrderStatus.IN_TRANSIT]: { title: 'Package In Transit', msg: `Package #${order.trackingNumber} is in transit towards the destination hub.` },
      [OrderStatus.OUT_FOR_DELIVERY]: { title: 'Out for Delivery', msg: `Your order #${order.trackingNumber} is out for delivery! The agent will arrive shortly.` },
      [OrderStatus.DELIVERED]: { title: 'Package Delivered', msg: `Your package #${order.trackingNumber} has been successfully delivered.` },
      [OrderStatus.FAILED]: { title: 'Delivery Attempt Failed', msg: `Delivery attempt for #${order.trackingNumber} failed: "${dto.failureReason}". Please reschedule your delivery.` },
      [OrderStatus.RESCHEDULED]: { title: 'Delivery Rescheduled', msg: `Delivery for #${order.trackingNumber} has been rescheduled.` },
      [OrderStatus.CANCELLED]: { title: 'Order Cancelled', msg: `Order #${order.trackingNumber} was cancelled.` },
    };

    const notifInfo = notifMessages[dto.status];
    if (notifInfo) {
      await this.notificationsService.send({
        userId: order.customerId,
        orderId: order.id,
        title: notifInfo.title,
        message: notifInfo.msg,
        type: `ORDER_${dto.status}`,
        channel: 'IN_APP',
      });
    }

    return this.getOrderById(updatedOrder.id);
  }

  /**
   * Reschedule a failed delivery
   */
  async rescheduleOrder(id: string, dto: RescheduleOrderDto, currentUser: any) {
    const order = await this.getOrderById(id, currentUser);

    if (order.status !== OrderStatus.FAILED) {
      throw new BadRequestException(`Only failed orders can be rescheduled. Current status is ${order.status}`);
    }

    const rescheduledDate = new Date(dto.newDeliveryDate);
    if (isNaN(rescheduledDate.getTime())) {
      throw new BadRequestException('Invalid reschedule date format');
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.RESCHEDULED,
          rescheduledDate,
          agentId: null, // Clear agent to re-enter assignment pool
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.RESCHEDULED,
          actorId: currentUser.id,
          actorRole: currentUser.role,
          actorName: currentUser.name || 'Customer',
          notes: `Customer rescheduled delivery to ${rescheduledDate.toLocaleDateString()}.${dto.notes ? ' Notes: ' + dto.notes : ''}`,
        },
      });

      return ord;
    });

    await this.notificationsService.send({
      userId: order.customerId,
      orderId: order.id,
      title: 'Delivery Rescheduled Successfully',
      message: `Your order #${order.trackingNumber} has been rescheduled for ${rescheduledDate.toLocaleDateString()}. We will dispatch a delivery agent on that date.`,
      type: 'ORDER_RESCHEDULED',
      channel: 'IN_APP',
    });

    if (dto.autoReassign !== false) {
      try {
        await this.assignmentService.autoAssignOrder(updatedOrder.id);
      } catch (err) {
        this.logger.log(`Auto re-assignment for rescheduled order ${order.id} will run in next dispatch cycle.`);
      }
    }

    return this.getOrderById(updatedOrder.id);
  }

  /**
   * Admin Override of Order Status
   */
  async adminOverride(id: string, dto: AdminOverrideDto, adminUser: any) {
    const order = await this.getOrderById(id);

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id: order.id },
        data: {
          status: dto.newStatus,
          ...(dto.newAgentId && { agentId: dto.newAgentId }),
          ...(dto.newStatus === OrderStatus.DELIVERED && { deliveredAt: new Date() }),
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: dto.newStatus,
          actorId: adminUser.id,
          actorRole: 'ADMIN',
          actorName: adminUser.name || 'Admin Operations',
          notes: `[ADMIN OVERRIDE]: ${dto.auditReason}`,
        },
      });

      return ord;
    });

    return this.getOrderById(updatedOrder.id);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(id: string, currentUser: any, reason?: string) {
    const order = await this.getOrderById(id, currentUser);

    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(`Cannot cancel order in status ${order.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });

      if (order.agentId) {
        await tx.agentProfile.update({
          where: { id: order.agentId },
          data: { availabilityStatus: AgentStatus.AVAILABLE },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.CANCELLED,
          actorId: currentUser.id,
          actorRole: currentUser.role,
          actorName: currentUser.name,
          notes: reason || 'Order cancelled',
        },
      });

      return ord;
    });
  }
}
