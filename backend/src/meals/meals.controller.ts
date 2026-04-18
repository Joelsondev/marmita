import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { MealsService, CreateMealDto, UpdateMealDto } from './meals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

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
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateMealDto, @Request() req) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateMealDto, @Request() req) {
    return this.service.update(id, req.user.tenantId, dto);
  }

  @Post(':id/copy')
  @UseGuards(RolesGuard)
  @Roles('admin')
  copy(@Param('id') id: string, @Body('targetDate') targetDate: string, @Request() req) {
    return this.service.copyMeal(id, req.user.tenantId, targetDate);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string, @Request() req) {
    return this.service.remove(id, req.user.tenantId);
  }
}
