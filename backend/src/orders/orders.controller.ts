import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { OrdersService, CreateOrderDto } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString } from 'class-validator';


export class PickupByCpfDto {
  @IsString() cpf: string;
}

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private service: OrdersService) {}

  @Get('dashboard')
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
  approveOrder(@Param('id') id: string, @Request() req) {
    return this.service.approveOrder(id, req.user.tenantId);
  }

  @Post(':id/cancel')
  cancelOrder(@Param('id') id: string, @Request() req) {
    return this.service.cancelOrder(id, req.user.tenantId);
  }

  @Post(':id/pickup')
  confirmPickup(@Param('id') id: string, @Request() req) {
    return this.service.confirmPickup(id, req.user.tenantId);
  }

  @Post(':id/pickup/force')
  forcePickup(@Param('id') id: string, @Request() req) {
    return this.service.forcePickup(id, req.user.tenantId);
  }

  @Post('pickup/cpf')
  confirmPickupByCpf(@Body() dto: PickupByCpfDto, @Request() req) {
    return this.service.confirmPickupByCpf(dto.cpf, req.user.tenantId);
  }
}
