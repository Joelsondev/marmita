import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private service: AuditLogsService) {}

  @Get()
  findAll(
    @Request() req,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const l = limit ? parseInt(limit, 10) : 50;
    const o = offset ? parseInt(offset, 10) : 0;

    if (action) return this.service.findByAction(req.user.tenantId, action, l, o);
    return this.service.findAll(req.user.tenantId, l, o);
  }
}
