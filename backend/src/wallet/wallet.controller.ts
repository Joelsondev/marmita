import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { WalletService, AddCreditDto } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('wallet')
export class WalletController {
  constructor(private service: WalletService) {}

  @Get('summary')
  getTenantSummary(@Request() req) {
    return this.service.getTenantSummary(req.user.tenantId);
  }

  @Post(':customerId/credit')
  addCredit(@Param('customerId') customerId: string, @Body() dto: AddCreditDto, @Request() req) {
    return this.service.addCredit(customerId, req.user.tenantId, dto, req.user);
  }

  @Get(':customerId/transactions')
  getTransactions(@Param('customerId') customerId: string, @Request() req) {
    return this.service.getTransactions(customerId, req.user.tenantId);
  }
}
