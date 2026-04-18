import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { DiscountsService, UpsertDiscountDto } from './discounts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('discounts')
export class DiscountsController {
  constructor(private service: DiscountsService) {}

  @Get('rule')
  getRule(@Request() req) {
    return this.service.getRule(req.user.tenantId);
  }

  @Put('rule')
  upsert(@Body() dto: UpsertDiscountDto, @Request() req) {
    return this.service.upsert(req.user.tenantId, dto);
  }
}
