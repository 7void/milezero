import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AssignmentService } from '../assignment/assignment.service';
import { OrderStatus, Role, AgentStatus } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: any;
  let pricingService: any;
  let notificationsService: any;
  let assignmentService: any;

  beforeEach(async () => {
    prismaService = {
      order: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      deliveryAttempt: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
      agentProfile: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      orderStatusHistory: {
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      address: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(prismaService)),
    };

    pricingService = {
      calculateQuote: jest.fn(),
    };

    notificationsService = {
      send: jest.fn().mockResolvedValue(true),
    };

    assignmentService = {
      autoAssignOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prismaService },
        { provide: PricingService, useValue: pricingService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: AssignmentService, useValue: assignmentService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('updateOrderStatus - State Machine', () => {
    const mockOrder = {
      id: 'order-1',
      trackingNumber: 'MZ-2026-999',
      status: OrderStatus.OUT_FOR_DELIVERY,
      customerId: 'cust-1',
      agentId: 'agent-1',
      customer: { email: 'cust@example.com' },
    };

    const mockAgentUser = {
      id: 'user-agent-1',
      role: Role.AGENT,
      name: 'Agent Alex',
    };

    it('should allow valid transition from OUT_FOR_DELIVERY to DELIVERED', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);
      prismaService.agentProfile.findUnique.mockResolvedValue({ id: 'agent-1', userId: 'user-agent-1' });
      prismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.DELIVERED,
      });

      const result = await service.updateOrderStatus(
        'order-1',
        { status: OrderStatus.DELIVERED, notes: 'Handed to recipient' },
        mockAgentUser,
      );

      expect(prismaService.order.update).toHaveBeenCalled();
      expect(prismaService.agentProfile.update).toHaveBeenCalledWith({
        where: { id: 'agent-1' },
        data: { availabilityStatus: AgentStatus.AVAILABLE },
      });
      expect(notificationsService.send).toHaveBeenCalled();
    });

    it('should reject invalid transition from PENDING directly to DELIVERED', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING, agentId: null };
      prismaService.order.findUnique.mockResolvedValue(pendingOrder);

      await expect(
        service.updateOrderStatus(
          'order-1',
          { status: OrderStatus.DELIVERED },
          { id: 'admin-1', role: Role.ADMIN },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require failureReason when marking an order as FAILED', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);
      prismaService.agentProfile.findUnique.mockResolvedValue({ id: 'agent-1', userId: 'user-agent-1' });

      await expect(
        service.updateOrderStatus(
          'order-1',
          { status: OrderStatus.FAILED }, // missing failureReason
          mockAgentUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should record DeliveryAttempt and free agent when marked as FAILED', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);
      prismaService.agentProfile.findUnique.mockResolvedValue({ id: 'agent-1', userId: 'user-agent-1' });
      prismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.FAILED,
      });

      await service.updateOrderStatus(
        'order-1',
        { status: OrderStatus.FAILED, failureReason: 'Customer phone unreachable' },
        mockAgentUser,
      );

      expect(prismaService.deliveryAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          failureReason: 'Customer phone unreachable',
          attemptNumber: 1,
        }),
      });

      expect(prismaService.agentProfile.update).toHaveBeenCalledWith({
        where: { id: 'agent-1' },
        data: { availabilityStatus: AgentStatus.AVAILABLE },
      });
    });
  });

  describe('rescheduleOrder', () => {
    it('should allow customer to reschedule a FAILED delivery', async () => {
      const failedOrder = {
        id: 'order-fail',
        trackingNumber: 'MZ-2026-FAIL',
        status: OrderStatus.FAILED,
        customerId: 'cust-1',
      };

      prismaService.order.findUnique.mockResolvedValue(failedOrder);
      prismaService.order.update.mockResolvedValue({
        ...failedOrder,
        status: OrderStatus.RESCHEDULED,
      });

      const result = await service.rescheduleOrder(
        'order-fail',
        { newDeliveryDate: '2026-08-22T10:00:00.000Z', notes: 'Deliver after 2pm' },
        { id: 'cust-1', role: Role.CUSTOMER, name: 'Rahul' },
      );

      expect(prismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'order-fail' },
        data: expect.objectContaining({
          status: OrderStatus.RESCHEDULED,
        }),
      });
      expect(notificationsService.send).toHaveBeenCalled();
    });

    it('should reject rescheduling an order that is not in FAILED status', async () => {
      const deliveredOrder = {
        id: 'order-del',
        status: OrderStatus.DELIVERED,
        customerId: 'cust-1',
      };

      prismaService.order.findUnique.mockResolvedValue(deliveredOrder);

      await expect(
        service.rescheduleOrder(
          'order-del',
          { newDeliveryDate: '2026-08-22T10:00:00.000Z' },
          { id: 'cust-1', role: Role.CUSTOMER },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Authorization & Access Control', () => {
    const mockOrder = {
      id: 'order-auth-1',
      trackingNumber: 'MZ-2026-AUTH',
      status: OrderStatus.OUT_FOR_DELIVERY,
      customerId: 'cust-owner',
      agentId: 'agent-1',
    };

    it('should forbid customer from updating order delivery status directly', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.updateOrderStatus(
          'order-auth-1',
          { status: OrderStatus.DELIVERED },
          { id: 'cust-owner', role: Role.CUSTOMER },
        ),
      ).rejects.toThrow('Access denied: Customers cannot directly modify delivery fulfillment status');
    });

    it('should forbid unassigned agent from updating order status', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);
      prismaService.agentProfile.findUnique.mockResolvedValue({ id: 'agent-2', userId: 'user-agent-2' });

      await expect(
        service.updateOrderStatus(
          'order-auth-1',
          { status: OrderStatus.DELIVERED },
          { id: 'user-agent-2', role: Role.AGENT },
        ),
      ).rejects.toThrow('Access denied: You can only update status for orders assigned to you.');
    });

    it('should forbid customer from cancelling order already in OUT_FOR_DELIVERY', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.cancelOrder('order-auth-1', { id: 'cust-owner', role: Role.CUSTOMER }, 'Changed mind'),
      ).rejects.toThrow('Cannot cancel order once it has reached "OUT_FOR_DELIVERY"');
    });

    it('should forbid non-owner customer from cancelling another customer order', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.cancelOrder('order-auth-1', { id: 'cust-stranger', role: Role.CUSTOMER }, 'Cancel'),
      ).rejects.toThrow('Access denied');
    });

    it('should allow customer to cancel own order in PENDING status', async () => {
      const pendingOrder = {
        id: 'order-pending-1',
        status: OrderStatus.PENDING,
        customerId: 'cust-owner',
        agentId: null,
      };
      prismaService.order.findUnique.mockResolvedValue(pendingOrder);
      prismaService.order.update.mockResolvedValue({ ...pendingOrder, status: OrderStatus.CANCELLED });

      const result = await service.cancelOrder(
        'order-pending-1',
        { id: 'cust-owner', role: Role.CUSTOMER, name: 'Alice' },
        'No longer needed',
      );

      expect(prismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'order-pending-1' },
        data: { status: OrderStatus.CANCELLED },
      });
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });
  });
});

