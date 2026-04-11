import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateOptionDto {
  @IsString() groupId: string;
  @IsString() name: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
}

@Injectable()
export class OptionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOptionDto) {
    return this.prisma.option.create({ data: { ...dto, price: dto.price ?? 0 } });
  }

  async remove(id: string) {
    const opt = await this.prisma.option.findUnique({ where: { id } });
    if (!opt) throw new NotFoundException('Opção não encontrada');
    return this.prisma.option.delete({ where: { id } });
  }
}
