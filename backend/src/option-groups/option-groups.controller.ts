import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { OptionGroupsService, CreateOptionGroupDto } from './option-groups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('option-groups')
export class OptionGroupsController {
  constructor(private service: OptionGroupsService) {}

  @Post()
  create(@Body() dto: CreateOptionGroupDto) {
    return this.service.create(dto);
  }

  @Get('meal/:mealId')
  findByMeal(@Param('mealId') mealId: string) {
    return this.service.findByMeal(mealId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
