import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentService, calculateHaversineDistanceKm } from './assignment.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AgentStatus, OrderStatus } from '@prisma/client';

describe('AssignmentService', () => {
  let service: AssignmentService;
  let prismaService: any;
  let notificationsService: any;

  beforeEach(async () => {
    prismaService = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      agentProfile: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      orderStatusHistory: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => callback(prismaService)),
    };

    notificationsService = {
      send: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentService,
        { provide: PrismaService, useValue: prismaService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<AssignmentService>(AssignmentService);
  });

  describe('calculateHaversineDistanceKm', () => {
    it('should calculate accurate distance between two GPS coordinates', () => {
      // MG Road (12.9716, 77.5946) to Koramangala (12.9352, 77.6245) is approx 5.2 km
      const distance = calculateHaversineDistanceKm(12.9716, 77.5946, 12.9352, 77.6245);
      expect(distance).toBeGreaterThan(4.5);
      expect(distance).toBeLessThan(6.0);
    });

    it('should return 0 for identical coordinates', () => {
      const distance = calculateHaversineDistanceKm(12.9716, 77.5946, 12.9716, 77.5946);
      expect(distance).toBe(0);
    });
  });

  describe('autoAssignOrder', () => {
    const mockOrder = {
      id: 'order-101',
      trackingNumber: 'MZ-2026-101',
      status: OrderStatus.PENDING,
      customerId: 'cust-1',
      pickupZoneId: 'zone-central',
      pickupAddress: {
        street: '123 MG Road',
        city: 'Bengaluru',
        lat: 12.9716,
        lng: 77.5946,
      },
      customer: { email: 'cust@example.com' },
    };

    const mockAgents = [
      {
        id: 'agent-far',
        userId: 'u-far',
        availabilityStatus: AgentStatus.AVAILABLE,
        currentLat: 13.0827, // Far north (~15km)
        currentLng: 77.5877,
        currentZoneId: 'zone-north',
        user: { name: 'Far Agent', phone: '+919999999991' },
      },
      {
        id: 'agent-near',
        userId: 'u-near',
        availabilityStatus: AgentStatus.AVAILABLE,
        currentLat: 12.9730, // Very close to MG Road (~0.2km)
        currentLng: 77.5950,
        currentZoneId: 'zone-central',
        user: { name: 'Near Agent', phone: '+919999999992' },
      },
    ];

    it('should select the nearest available agent based on proximity', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);
      prismaService.agentProfile.findMany.mockResolvedValue(mockAgents);
      prismaService.order.update.mockResolvedValue({
        ...mockOrder,
        agentId: 'agent-near',
        status: OrderStatus.ASSIGNED,
      });

      const result = await service.autoAssignOrder('order-101');

      expect(result.assigned).toBe(true);
      expect(result.agent.id).toBe('agent-near');
      expect(result.distanceKm).toBeLessThan(1.0);
      expect(prismaService.agentProfile.update).toHaveBeenCalledWith({
        where: { id: 'agent-near' },
        data: { availabilityStatus: AgentStatus.BUSY },
      });
      expect(notificationsService.send).toHaveBeenCalledTimes(2);
    });

    it('should fall back to zone matching if agent GPS is missing', async () => {
      const agentsWithoutGps = [
        {
          id: 'agent-north-no-gps',
          userId: 'u-1',
          availabilityStatus: AgentStatus.AVAILABLE,
          currentLat: null,
          currentLng: null,
          currentZoneId: 'zone-north',
          user: { name: 'North Agent' },
        },
        {
          id: 'agent-central-no-gps',
          userId: 'u-2',
          availabilityStatus: AgentStatus.AVAILABLE,
          currentLat: null,
          currentLng: null,
          currentZoneId: 'zone-central',
          user: { name: 'Central Agent' },
        },
      ];

      prismaService.order.findUnique.mockResolvedValue(mockOrder);
      prismaService.agentProfile.findMany.mockResolvedValue(agentsWithoutGps);
      prismaService.order.update.mockResolvedValue({
        ...mockOrder,
        agentId: 'agent-central-no-gps',
        status: OrderStatus.ASSIGNED,
      });

      const result = await service.autoAssignOrder('order-101');

      expect(result.assigned).toBe(true);
      expect(result.agent.id).toBe('agent-central-no-gps');
    });

    it('should handle case when no agents are available', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);
      prismaService.agentProfile.findMany.mockResolvedValue([]);

      const result = await service.autoAssignOrder('order-101');

      expect(result.assigned).toBe(false);
      expect(result.message).toContain('No available agents');
    });
  });
});
