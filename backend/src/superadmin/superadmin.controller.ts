import { Controller, Post, Get, Patch, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { SuperAdminService } from './superadmin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsEmail, IsString, IsIn, IsOptional, IsNumber, Min } from 'class-validator';

export class SuperAdminLoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

export class UpdateSubscriptionDto {
  @IsIn(['monthly', 'quarterly', 'annual']) plan: 'monthly' | 'quarterly' | 'annual';
  @IsIn(['trial', 'active', 'past_due', 'blocked']) status: 'trial' | 'active' | 'past_due' | 'blocked';
  @IsOptional() @IsNumber() @Min(1) durationDays?: number;
}

export class UnblockTenantDto {
  @IsIn(['monthly', 'quarterly', 'annual']) plan: 'monthly' | 'quarterly' | 'annual';
  @IsOptional() @IsNumber() @Min(1) durationDays?: number;
}

export class ExtendTrialDto {
  @IsNumber() @Min(1) days: number;
}

function assertSuperAdmin(req: any) {
  if (req.user.role !== 'superadmin') throw new ForbiddenException('Acesso negado');
}

@Controller('superadmin')
export class SuperAdminController {
  constructor(private service: SuperAdminService) {}

  @Post('login')
  login(@Body() dto: SuperAdminLoginDto) {
    return this.service.login(dto.email, dto.password);
  }

  @Get('tenants')
  @UseGuards(JwtAuthGuard)
  listTenants(@Request() req: any) {
    assertSuperAdmin(req);
    return this.service.listTenants();
  }

  @Get('tenants/inadimplentes')
  @UseGuards(JwtAuthGuard)
  getInadimplentes(@Request() req: any) {
    assertSuperAdmin(req);
    return this.service.getInadimplentes();
  }

  @Get('tenants/:tenantId')
  @UseGuards(JwtAuthGuard)
  getTenant(@Request() req: any, @Param('tenantId') tenantId: string) {
    assertSuperAdmin(req);
    return this.service.getTenant(tenantId);
  }

  @Patch('tenants/:tenantId/subscription')
  @UseGuards(JwtAuthGuard)
  updateSubscription(
    @Request() req: any,
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    assertSuperAdmin(req);
    return this.service.updateSubscription(tenantId, dto.plan, dto.status, dto.durationDays);
  }

  @Patch('tenants/:tenantId/block')
  @UseGuards(JwtAuthGuard)
  blockTenant(@Request() req: any, @Param('tenantId') tenantId: string) {
    assertSuperAdmin(req);
    return this.service.blockTenant(tenantId);
  }

  @Patch('tenants/:tenantId/unblock')
  @UseGuards(JwtAuthGuard)
  unblockTenant(
    @Request() req: any,
    @Param('tenantId') tenantId: string,
    @Body() dto: UnblockTenantDto,
  ) {
    assertSuperAdmin(req);
    return this.service.unblockTenant(tenantId, dto.plan, dto.durationDays);
  }

  @Patch('tenants/:tenantId/extend-trial')
  @UseGuards(JwtAuthGuard)
  extendTrial(
    @Request() req: any,
    @Param('tenantId') tenantId: string,
    @Body() dto: ExtendTrialDto,
  ) {
    assertSuperAdmin(req);
    return this.service.extendTrial(tenantId, dto.days);
  }

  @Post('tenants/:tenantId/impersonate')
  @UseGuards(JwtAuthGuard)
  impersonateTenant(@Request() req: any, @Param('tenantId') tenantId: string) {
    assertSuperAdmin(req);
    return this.service.impersonateTenant(tenantId);
  }
}
