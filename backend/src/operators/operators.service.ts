import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsEmail, IsString } from 'class-validator';
import * as bcrypt from 'bcrypt';

export class CreateOperatorDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() password: string;
}

@Injectable()
export class OperatorsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.operator.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, active: true, createdAt: true },
    });
  }

  async create(tenantId: string, dto: CreateOperatorDto) {
    const existing = await this.prisma.operator.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email já cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.operator.create({
      data: { tenantId, name: dto.name, email: dto.email, passwordHash },
      select: { id: true, name: true, email: true, active: true, createdAt: true },
    });
  }

  async deactivate(id: string, tenantId: string) {
    const op = await this.prisma.operator.findFirst({ where: { id, tenantId } });
    if (!op) throw new NotFoundException('Operador não encontrado');
    return this.prisma.operator.update({
      where: { id },
      data: { active: false },
      select: { id: true, name: true, email: true, active: true },
    });
  }

  async activate(id: string, tenantId: string) {
    const op = await this.prisma.operator.findFirst({ where: { id, tenantId } });
    if (!op) throw new NotFoundException('Operador não encontrado');
    return this.prisma.operator.update({
      where: { id },
      data: { active: true },
      select: { id: true, name: true, email: true, active: true },
    });
  }
}
