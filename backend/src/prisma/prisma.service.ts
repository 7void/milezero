import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully via Prisma');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase not allowed in production');
    }
    // Clean tables in reverse dependency order
    await this.notification.deleteMany();
    await this.orderStatusHistory.deleteMany();
    await this.deliveryAttempt.deleteMany();
    await this.order.deleteMany();
    await this.codConfig.deleteMany();
    await this.rateCard.deleteMany();
    await this.zonePincode.deleteMany();
    await this.address.deleteMany();
    await this.agentProfile.deleteMany();
    await this.customerProfile.deleteMany();
    await this.zone.deleteMany();
    await this.user.deleteMany();
  }
}
