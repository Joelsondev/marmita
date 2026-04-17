import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateMealDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Min(0) basePrice: number;
  @IsString() date: string;
}

export class UpdateMealDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() basePrice?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

@Injectable()
export class MealsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, date?: string) {
    return this.prisma.meal.findMany({
      where: {
        tenantId,
        ...(date ? { date: new Date(date) } : {}),
      },
      include: {
        optionGroups: { include: { options: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async copyMeal(id: string, tenantId: string, targetDate: string) {
    const meal = await this.findOne(id, tenantId);
    const newMeal = await this.prisma.meal.create({
      data: {
        tenantId,
        name: meal.name,
        description: meal.description ?? undefined,
        basePrice: meal.basePrice,
        date: new Date(targetDate),
        active: true,
      },
    });
    for (const group of meal.optionGroups) {
      const newGroup = await this.prisma.optionGroup.create({
        data: { mealId: newMeal.id, name: group.name, type: group.type, required: group.required },
      });
      for (const option of (group as any).options) {
        await this.prisma.option.create({
          data: { groupId: newGroup.id, name: option.name, price: option.price },
        });
      }
    }
    return this.findOne(newMeal.id, tenantId);
  }

  async findToday(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.meal.findMany({
      where: { tenantId, date: today, active: true },
      include: { optionGroups: { include: { options: true } } },
    });
  }

  async findOne(id: string, tenantId: string) {
    const meal = await this.prisma.meal.findFirst({
      where: { id, tenantId },
      include: { optionGroups: { include: { options: true } } },
    });
    if (!meal) throw new NotFoundException('Marmita não encontrada');
    return meal;
  }

  async create(tenantId: string, dto: CreateMealDto) {
    return this.prisma.meal.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        basePrice: dto.basePrice,
        date: new Date(dto.date),
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateMealDto) {
    await this.findOne(id, tenantId);
    return this.prisma.meal.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.meal.update({ where: { id }, data: { active: false } });
  }
}
