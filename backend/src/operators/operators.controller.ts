import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { OperatorsService, CreateOperatorDto } from './operators.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('operators')
export class OperatorsController {
  constructor(private service: OperatorsService) {}

  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.tenantId);
  }

  @Post()
  create(@Body() dto: CreateOperatorDto, @Request() req) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @Request() req) {
    return this.service.deactivate(id, req.user.tenantId);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string, @Request() req) {
    return this.service.activate(id, req.user.tenantId);
  }
}
