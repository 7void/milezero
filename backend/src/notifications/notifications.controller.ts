import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async getMyNotifications(
    @CurrentUser('id') userId: string,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationsService.getUserNotifications(userId, unreadOnly);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { unreadCount: count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark specific notification as read' })
  async markAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.notificationsService.markAsRead(id, userId);
    return { success: true };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all user notifications as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }
}
