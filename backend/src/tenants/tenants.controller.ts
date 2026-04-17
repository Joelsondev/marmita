import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tenants')
export class TenantsController {
  constructor(private service: TenantsService) {}

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMe(@Request() req) {
    return this.service.findById(req.user.tenantId);
  }
}
