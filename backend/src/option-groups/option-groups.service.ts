import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';

export class CreateOptionGroupDto {
  @IsString() mealId: string;
  @IsString() name: string;
  @IsEnum(['single', 'multiple']) type: 'single' | 'multiple';
  @IsOptional() @IsBoolean() required?: boolean;
}

@Injectable()
export class OptionGroupsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOptionGroupDto) {
    return this.prisma.optionGroup.create({ data: dto });
  }

  async findByMeal(mealId: string) {
    return this.prisma.optionGroup.findMany({
      where: { mealId },
      include: { options: true },
    });
  }

  async remove(id: string) {
    const group = await this.prisma.optionGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Grupo não encontrado');
    return this.prisma.optionGroup.delete({ where: { id } });
  }
}
