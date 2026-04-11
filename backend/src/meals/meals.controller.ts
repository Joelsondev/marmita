import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { MealsService, CreateMealDto, UpdateMealDto } from './meals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('meals')
export class MealsController {
  constructor(private service: MealsService) {}

  @Get()
  findAll(@Query('date') date: string, @Request() req) {
    return this.service.findAll(req.user.tenantId, date);
  }

  @Get('today')
  findToday(@Request() req) {
    return this.service.findToday(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.service.findOne(id, req.user.tenantId);
  }

  @Post()
  create(@Body() dto: CreateMealDto, @Request() req) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMealDto, @Request() req) {
    return this.service.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.service.remove(id, req.user.tenantId);
  }
}
