import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { OrdersService, CreateOrderDto } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { IsString } from 'class-validator';

export class PickupByCpfDto {
  @IsString() cpf: string;
}

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private service: OrdersService) {}

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles('admin')
  getDashboard(@Request() req) {
    return this.service.getDashboard(req.user.tenantId);
  }

  @Get('qr-token')
  getQrToken(@Request() req) {
    return this.service.generateQrToken(req.user.id);
  }

  @Get('lookup')
  lookupCheckout(
    @Query('cpf') cpf: string,
    @Query('customerId') customerId: string,
    @Query('qrToken') qrToken: string,
    @Request() req,
  ) {
    if (qrToken) return this.service.lookupByQrToken(req.user.tenantId, qrToken);
    return this.service.lookupCheckout(req.user.tenantId, cpf, customerId);
  }

  @Get('my')
  getMyOrders(@Request() req) {
    return this.service.getMyOrders(req.user.id);
  }

  @Get('history')
  getMyOrderHistory(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.getMyOrderHistory(
      req.user.id,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get()
  findAll(@Query('date') date: string, @Request() req) {
    return this.service.findAll(req.user.tenantId, date);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.service.findOne(id, req.user.tenantId);
  }

  @Post()
  create(@Body() dto: CreateOrderDto, @Request() req) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('admin')
  approveOrder(@Param('id') id: string, @Request() req) {
    return this.service.approveOrder(id, req.user.tenantId);
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles('admin')
  cancelOrder(@Param('id') id: string, @Request() req) {
    return this.service.cancelOrder(id, req.user.tenantId);
  }

  @Post(':id/pickup')
  confirmPickup(@Param('id') id: string, @Request() req) {
    return this.service.confirmPickup(id, req.user.tenantId);
  }

  @Post(':id/pickup/force')
  @UseGuards(RolesGuard)
  @Roles('admin')
  forcePickup(@Param('id') id: string, @Request() req) {
    return this.service.forcePickup(id, req.user.tenantId);
  }

  @Post('pickup/cpf')
  confirmPickupByCpf(@Body() dto: PickupByCpfDto, @Request() req) {
    return this.service.confirmPickupByCpf(dto.cpf, req.user.tenantId);
  }
}
