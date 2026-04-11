import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CustomersService, CreateCustomerDto, UpdateCustomerDto } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private service: CustomersService) {}

  @Get('me')
  findMe(@Request() req) {
    return this.service.findOne(req.user.sub, req.user.tenantId);
  }

  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.tenantId);
  }

  @Get('cpf/:cpf')
  findByCpf(@Param('cpf') cpf: string, @Request() req) {
    return this.service.findByCpf(cpf, req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.service.findOne(id, req.user.tenantId);
  }

  @Post()
  create(@Body() dto: CreateCustomerDto, @Request() req) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @Request() req) {
    return this.service.update(id, req.user.tenantId, dto);
  }
}
