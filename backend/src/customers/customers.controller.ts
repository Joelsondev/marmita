import { Controller, Get, Post, Put, Patch, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { CustomersService, CreateCustomerDto, UpdateCustomerDto } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private service: CustomersService) {}

  @Get('me')
  findMe(@Request() req) {
    return this.service.findOne(req.user.id, req.user.tenantId);
  }

  @Get('me/transactions')
  getMyTransactions(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.getMyTransactions(
      req.user.id,
      limit ? parseInt(limit, 10) : 30,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get()
  findAll(@Request() req, @Query('blocked') blocked?: string, @Query('debtors') debtors?: string) {
    if (blocked === 'true') return this.service.getBlockedCustomersForTenant(req.user.tenantId);
    if (debtors === 'true') return this.service.getDebtors(req.user.tenantId);
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
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateCustomerDto, @Request() req) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @Request() req) {
    return this.service.update(id, req.user.tenantId, dto);
  }

  @Patch(':id/unblock')
  @UseGuards(RolesGuard)
  @Roles('admin')
  unblockCustomer(@Param('id') id: string, @Request() req) {
    return this.service.unblockCustomer(id, req.user.tenantId);
  }
}
