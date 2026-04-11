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

  @Get('lookup')
  lookupCheckout(@Query('cpf') cpf: string, @Query('customerId') customerId: string, @Request() req) {
    return this.service.lookupCheckout(req.user.tenantId, cpf, customerId);
  }

  @Get('my')
  getMyOrders(@Request() req) {
    return this.service.getMyOrders(req.user.sub);
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

  @Post(':id/pickup')
  confirmPickup(@Param('id') id: string, @Request() req) {
    return this.service.confirmPickup(id, req.user.tenantId);
  }

  @Post('pickup/cpf')
  confirmPickupByCpf(@Body() dto: PickupByCpfDto, @Request() req) {
    return this.service.confirmPickupByCpf(dto.cpf, req.user.tenantId);
  }
}
