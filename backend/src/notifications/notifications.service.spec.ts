import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaService: any;
  let configService: any;

  beforeEach(async () => {
    prismaService = {
      notification: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'notif-1', ...data })),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    configService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prismaService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should persist notification and fall back safely to log when no providers configured', async () => {
    const result = await service.send({
      userId: 'user-1',
      title: 'Order Dispatched',
      message: 'Package is on its way',
      type: 'ORDER_DISPATCHED',
      channel: 'EMAIL',
      recipientEmail: 'customer@example.com',
      recipientPhone: '+919876543210',
    });

    expect(prismaService.notification.create).toHaveBeenCalled();
    expect(result.id).toBe('notif-1');
  });

  it('should trigger Resend email provider when RESEND_API_KEY is configured', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'RESEND_API_KEY') return 're_test_key_123';
      if (key === 'EMAIL_FROM_ADDRESS') return 'onboarding@resend.dev';
      return undefined;
    });

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 'email_123' }),
    });
    global.fetch = mockFetch;

    await service.send({
      userId: 'user-1',
      title: 'Delivery Update',
      message: 'Out for delivery',
      type: 'ORDER_OUT_FOR_DELIVERY',
      channel: 'EMAIL',
      recipientEmail: 'customer@example.com',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer re_test_key_123',
        }),
      }),
    );
  });

  it('should trigger SendGrid email provider when SENDGRID_API_KEY is configured', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'SENDGRID_API_KEY') return 'SG.test_key_123';
      if (key === 'EMAIL_FROM_ADDRESS') return 'deliveries@milezero.com';
      return undefined;
    });

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: jest.fn().mockResolvedValue({}),
    });
    global.fetch = mockFetch;

    await service.send({
      userId: 'user-1',
      title: 'Order Confirmed',
      message: 'Booking confirmed',
      type: 'ORDER_CREATED',
      channel: 'EMAIL',
      recipientEmail: 'customer@example.com',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.sendgrid.com/v3/mail/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer SG.test_key_123',
        }),
      }),
    );
  });

  it('should gracefully handle provider network errors without throwing or failing notification creation', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'RESEND_API_KEY') return 're_test_key_123';
      return undefined;
    });

    global.fetch = jest.fn().mockRejectedValue(new Error('Network connection timeout'));

    const result = await service.send({
      userId: 'user-1',
      title: 'System Alert',
      message: 'Weather delay warning',
      type: 'ALERT',
      channel: 'EMAIL',
      recipientEmail: 'customer@example.com',
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('notif-1');
  });
});
