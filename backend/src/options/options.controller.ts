import { Controller, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { OptionsService, CreateOptionDto } from './options.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('options')
export class OptionsController {
  constructor(private service: OptionsService) {}

  @Post()
  create(@Body() dto: CreateOptionDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
