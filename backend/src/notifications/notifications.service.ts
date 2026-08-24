import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SendNotificationOptions {
  userId: string;
  orderId?: string;
  title: string;
  message: string;
  type: string;
  channel?: 'IN_APP' | 'EMAIL' | 'SMS';
  recipientEmail?: string;
  recipientPhone?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(options: SendNotificationOptions) {
    const channel = options.channel || 'IN_APP';

    const notification = await this.prisma.notification.create({
      data: {
        userId: options.userId,
        orderId: options.orderId,
        title: options.title,
        message: options.message,
        type: options.type,
        channel,
        metadata: options.metadata ? JSON.stringify(options.metadata) : null,
      },
    });

    if (options.recipientEmail || channel === 'EMAIL') {
      this.logger.log(
        `[Email Notification] To: ${options.recipientEmail || 'User #' + options.userId} | Subject: "${options.title}" | Message: ${options.message}`,
      );
    }

    if (options.recipientPhone || channel === 'SMS') {
      this.logger.log(
        `[SMS Notification] To: ${options.recipientPhone || 'User #' + options.userId} | "${options.title} - ${options.message}"`,
      );
    }

    return notification;
  }

  async getUserNotifications(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
