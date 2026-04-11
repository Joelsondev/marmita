import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddCreditDto {
  @IsNumber() @Min(0.01) amount: number;
  @IsOptional() @IsString() description?: string;
}

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async addCredit(customerId: string, tenantId: string, dto: AddCreditDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    const [transaction, updated] = await this.prisma.$transaction([
      this.prisma.walletTransaction.create({
        data: {
          customerId,
          type: 'CREDIT',
          amount: dto.amount,
          description: dto.description || 'Crédito adicionado',
        },
      }),
      this.prisma.customer.update({
        where: { id: customerId },
        data: { balance: { increment: dto.amount } },
      }),
    ]);

    return { balance: updated.balance, transaction };
  }

  async debit(customerId: string, amount: number, description: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Cliente não encontrado');
    if (Number(customer.balance) < amount) throw new BadRequestException('Saldo insuficiente');

    const [transaction, updated] = await this.prisma.$transaction([
      this.prisma.walletTransaction.create({
        data: { customerId, type: 'DEBIT', amount, description },
      }),
      this.prisma.customer.update({
        where: { id: customerId },
        data: { balance: { decrement: amount } },
      }),
    ]);

    return { balance: updated.balance, transaction };
  }

  async getTransactions(customerId: string, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    return this.prisma.walletTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
