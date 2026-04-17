import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsNotEmpty, Length, Matches } from 'class-validator';

export class CreateCustomerDto {
  @IsString() @IsNotEmpty({ message: 'Nome é obrigatório' }) name: string;
  @IsString() @IsNotEmpty({ message: 'CPF é obrigatório' }) @Length(11, 11, { message: 'CPF deve ter 11 dígitos' }) @Matches(/^\d{11}$/, { message: 'CPF deve conter apenas números' }) cpf: string;
  @IsOptional() @IsString() phone?: string;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
}

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.customer.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, cpf: true, phone: true, balance: true, createdAt: true },
    });
  }

  async findOne(id: string, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { items: { include: { meal: true } } },
        },
      },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado');
    return customer;
  }

  async findByCpf(cpf: string, tenantId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { tenantId_cpf: { tenantId, cpf } },
    });
    if (!customer) throw new NotFoundException('CPF não encontrado');
    return customer;
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { tenantId_cpf: { tenantId, cpf: dto.cpf } },
    });
    if (existing) throw new ConflictException('CPF já cadastrado');

    return this.prisma.customer.create({
      data: { ...dto, tenantId },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateCustomerDto) {
    await this.findOne(id, tenantId);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async unblockCustomer(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.customer.update({
      where: { id },
      data: { isBlocked: false, noShowCount: 0, blockReason: null, lastNoShowAt: null },
    });
  }

  async getBlockedCustomersForTenant(tenantId: string) {
    return this.prisma.customer.findMany({
      where: { tenantId, isBlocked: true },
      orderBy: { lastNoShowAt: 'desc' },
    });
  }
}
