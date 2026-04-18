import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

type Actor = { id: string; role: string };

export class AddCreditDto {
  @IsNumber() @Min(0.01) amount: number;
  @IsOptional() @IsString() description?: string;
}

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService, private auditLogs: AuditLogsService) {}

  async addCredit(customerId: string, tenantId: string, dto: AddCreditDto, actor: Actor) {
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

    await this.auditLogs.log({
      tenantId,
      actor,
      action: 'ADD_CREDIT',
      targetId: customerId,
      targetType: 'CUSTOMER',
      metadata: { customerId, customerName: customer.name, amount: dto.amount, description: dto.description || 'Crédito adicionado' },
    });

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

  async getTenantSummary(tenantId: string) {
    const result = await this.prisma.customer.aggregate({
      where: { tenantId },
      _sum: { balance: true },
      _count: { id: true },
    });

    const debtors = await this.prisma.customer.count({
      where: { tenantId, balance: { lt: 0 } },
    });

    const totalDebt = await this.prisma.customer.aggregate({
      where: { tenantId, balance: { lt: 0 } },
      _sum: { balance: true },
    });

    return {
      totalCustomers: result._count.id,
      totalSystemBalance: result._sum.balance ?? 0,
      debtorsCount: debtors,
      totalDebt: totalDebt._sum.balance ?? 0,
    };
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
