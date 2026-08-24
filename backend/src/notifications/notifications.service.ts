import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Dispatches notification with channel routing, email provider hooks, and resilient fallback
   */
  async send(options: SendNotificationOptions) {
    const channel = options.channel || 'IN_APP';

    // 1. Always persist in-app notification to database for complete audit trail & user inbox
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

    // 2. Dispatch Email if recipient email provided or channel is EMAIL
    if (options.recipientEmail || channel === 'EMAIL') {
      const email = options.recipientEmail;
      if (email) {
        await this.dispatchEmail(email, options.title, options.message, options.metadata);
      } else {
        this.logger.warn(`[Email Notification Skipped] User #${options.userId} has no email address configured.`);
      }
    }

    // 3. Log SMS / phone updates in audit trail
    if (options.recipientPhone || channel === 'SMS') {
      this.logger.log(
        `[Customer Alert] Recipient: ${options.recipientPhone || 'User #' + options.userId} | "${options.title}: ${options.message}"`,
      );
    }

    return notification;
  }

  /**
   * Real Email Provider Dispatcher with Safe Fallback
   * Supports Resend, SendGrid, generic Webhook, or local audit log fallback.
   */
  private async dispatchEmail(
    to: string,
    subject: string,
    body: string,
    metadata?: Record<string, any>,
  ): Promise<boolean> {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    const sendgridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
    const emailWebhookUrl = this.configService.get<string>('EMAIL_WEBHOOK_URL');
    const fromEmail =
      this.configService.get<string>('EMAIL_FROM_ADDRESS') ||
      'onboarding@resend.dev';

    // A. Resend Provider Hook (Recommended)
    if (resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail.includes('@') ? fromEmail : 'onboarding@resend.dev',
            to: [to],
            subject,
            text: body,
            html: `<div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; rounded: 8px;">
              <h2 style="color: #111827; margin-bottom: 8px;">${subject}</h2>
              <p style="color: #4b5563; font-size: 15px; line-height: 1.5;">${body}</p>
              <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
              <small style="color: #9ca3af; font-size: 12px;">MileZero Logistics · Real-Time Delivery Tracking Engine</small>
            </div>`,
          }),
        });

        if (response.ok) {
          this.logger.log(`[Email Provider: Resend] Dispatched successfully to ${to}`);
          return true;
        } else {
          const errText = await response.text();
          this.logger.warn(`[Email Provider: Resend] HTTP ${response.status}: ${errText}. Falling back to safe log.`);
        }
      } catch (err: any) {
        this.logger.warn(`[Email Provider: Resend] Network error: ${err.message}. Falling back to safe log.`);
      }
    }

    // B. SendGrid Provider Hook
    if (sendgridApiKey) {
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sendgridApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: fromEmail, name: 'MileZero Logistics' },
            subject,
            content: [{ type: 'text/plain', value: body }],
          }),
        });

        if (response.ok || response.status === 202) {
          this.logger.log(`[Email Provider: SendGrid] Dispatched successfully to ${to}`);
          return true;
        } else {
          const errText = await response.text();
          this.logger.warn(`[Email Provider: SendGrid] HTTP ${response.status}: ${errText}. Falling back to safe log.`);
        }
      } catch (err: any) {
        this.logger.warn(`[Email Provider: SendGrid] Network error: ${err.message}. Falling back to safe log.`);
      }
    }

    // C. Generic Email Webhook Hook
    if (emailWebhookUrl) {
      try {
        const response = await fetch(emailWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-MileZero-Event': 'email.notification',
          },
          body: JSON.stringify({ to, subject, body, metadata, timestamp: new Date().toISOString() }),
        });

        if (response.ok) {
          this.logger.log(`[Email Provider: Webhook] Dispatched successfully to ${to}`);
          return true;
        } else {
          this.logger.warn(`[Email Provider: Webhook] HTTP ${response.status}. Falling back to safe log.`);
        }
      } catch (err: any) {
        this.logger.warn(`[Email Provider: Webhook] Network error: ${err.message}. Falling back to safe log.`);
      }
    }

    // Safe Audit Log Fallback (Used when no provider configured or when external APIs fail)
    this.logger.log(
      `[Email Notification: Safe Log Fallback] To: ${to} | Subject: "${subject}" | Message: ${body}`,
    );
    return true;
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


