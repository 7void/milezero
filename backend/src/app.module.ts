import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ZonesModule } from './zones/zones.module';
import { PricingModule } from './pricing/pricing.module';
import { AgentsModule } from './agents/agents.module';
import { AssignmentModule } from './assignment/assignment.module';
import { OrdersModule } from './orders/orders.module';
import { TrackingModule } from './tracking/tracking.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    AuthModule,
    ZonesModule,
    PricingModule,
    AgentsModule,
    AssignmentModule,
    OrdersModule,
    TrackingModule,
    NotificationsModule,
    AdminModule,
  ],
})
export class AppModule {}
