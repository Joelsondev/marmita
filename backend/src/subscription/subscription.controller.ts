import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { IsIn } from 'class-validator';

export class ActivateDto {
  @IsIn(['monthly', 'quarterly', 'annual']) plan: 'monthly' | 'quarterly' | 'annual';
}

@Controller('subscription')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionController {
  constructor(private service: SubscriptionService) {}

  @Get()
  getInfo(@Request() req: any) {
    return this.service.getInfo(req.user.tenantId);
  }

  @Post('activate')
  activate(@Request() req: any, @Body() dto: ActivateDto) {
    return this.service.activate(req.user.tenantId, dto.plan);
  }
}
