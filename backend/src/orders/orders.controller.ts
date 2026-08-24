import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto, RescheduleOrderDto, AdminOverrideDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, OrderStatus } from '@prisma/client';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new delivery order with instant price verification' })
  async createOrder(@Body() dto: CreateOrderDto, @CurrentUser() currentUser: any) {
    return this.ordersService.createOrder(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get orders list with role scoping and filters' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'zoneId', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'agentId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'serviceType', required: false, type: String })
  @ApiQuery({ name: 'paymentMode', required: false, type: String })
  async getAllOrders(
    @CurrentUser() currentUser: any,
    @Query('status') status?: OrderStatus,
    @Query('zoneId') zoneId?: string,
    @Query('customerId') customerId?: string,
    @Query('agentId') agentId?: string,
    @Query('search') search?: string,
    @Query('serviceType') serviceType?: string,
    @Query('paymentMode') paymentMode?: string,
  ) {
    return this.ordersService.getAllOrders(
      { status, zoneId, customerId, agentId, search, serviceType, paymentMode },
      currentUser,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details by ID with complete tracking timeline and delivery attempts' })
  async getOrderById(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.ordersService.getOrderById(id, currentUser);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'Update delivery status with state machine enforcement (Agent or Admin only)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.ordersService.updateOrderStatus(id, dto, currentUser);
  }

  @Post(':id/reschedule')
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiOperation({ summary: 'Reschedule a failed delivery order (Customer owner or Admin)' })
  async rescheduleOrder(
    @Param('id') id: string,
    @Body() dto: RescheduleOrderDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.ordersService.rescheduleOrder(id, dto, currentUser);
  }

  @Post(':id/admin-override')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin override order status with mandatory audit reason (Admin only)' })
  async adminOverride(
    @Param('id') id: string,
    @Body() dto: AdminOverrideDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.ordersService.adminOverride(id, dto, currentUser);
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiOperation({ summary: 'Cancel an order (Customer owner prior to dispatch or Admin)' })
  async cancelOrder(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.ordersService.cancelOrder(id, currentUser, reason);
  }
}
