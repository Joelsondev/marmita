import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountsService } from '../discounts/discounts.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

type Actor = { id: string; role: string };
import { IsArray, IsString, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemOptionDto {
  @IsString() optionId: string;
}

export class OrderItemDto {
  @IsString() mealId: string;
  @IsNumber() @Min(1) quantity: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemOptionDto)
  options?: OrderItemOptionDto[];
}

export class CreateOrderDto {
  @IsString() customerId: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[];
  @IsOptional() forceBlocked?: boolean;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private discounts: DiscountsService,
    private wallet: WalletService,
    private auditLogs: AuditLogsService,
  ) {}

  // ── Chave AES derivada do JWT_SECRET ─────────────────────────────────────
  private getAesKey(): Buffer {
    return crypto.scryptSync(process.env.JWT_SECRET || 'secret', 'marmita-qr-v1', 32);
  }

  async generateQrToken(customerId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    const todayStr = new Date().toISOString().split('T')[0];
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);

    const order = await this.prisma.order.findFirst({
      where: {
        customerId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        createdAt: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { createdAt: 'desc' },
    });

    // plaintext: cpf:orderId:date (com pedido) ou cpf:date (sem pedido)
    const plaintext = order
      ? `${customer.cpf}:${order.id}:${todayStr}`
      : `${customer.cpf}:${todayStr}`;

    const key    = this.getAesKey();
    const iv     = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc    = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag    = cipher.getAuthTag();
    const token  = Buffer.concat([iv, enc, tag]).toString('hex');

    return {
      token,
      orderCode: order ? order.id.slice(-8).toUpperCase() : null,
      hasOrder: !!order,
    };
  }

  async lookupByQrToken(tenantId: string, token: string) {
    let plain: string;
    try {
      const key      = this.getAesKey();
      const buf      = Buffer.from(token, 'hex');
      const iv       = buf.slice(0, 12);
      const tag      = buf.slice(buf.length - 16);
      const enc      = buf.slice(12, buf.length - 16);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      plain = decipher.update(enc, undefined, 'utf8') + decipher.final('utf8');
    } catch {
      throw new BadRequestException('QR Code inválido ou corrompido.');
    }

    const parts   = plain.split(':');
    const todayStr = new Date().toISOString().split('T')[0];

    // cpf:orderId:date (3 partes) ou cpf:date (2 partes)
    const hasOrder = parts.length === 3;
    const cpf      = parts[0];
    const orderId  = hasOrder ? parts[1] : undefined;
    const date     = parts[hasOrder ? 2 : 1];

    if (date !== todayStr) throw new BadRequestException('QR Code expirado. Peça ao cliente para atualizar.');
    if (!cpf || cpf.length !== 11) throw new BadRequestException('QR Code inválido.');

    // Bloqueia dupla leitura: verifica se o pedido ainda está pendente
    if (orderId) {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!order) throw new BadRequestException('Pedido não encontrado.');
      if (order.status === 'PICKED_UP') {
        const at = order.pickedUpAt
          ? new Date(order.pickedUpAt).toLocaleString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })
          : null;
        const suffix = at ? ` Retirado em ${at}.` : '';
        throw new BadRequestException(`Este QR Code já foi utilizado. Pedido já retirado.${suffix}`);
      }
    }

    return this.lookupCheckout(tenantId, cpf, undefined);
  }

  async findAll(tenantId: string, date?: string) {
    // Detect and mark no-shows before returning orders
    await this.detectAndMarkNoShows(tenantId);

    const whereDate = date ? new Date(date) : (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
    const nextDay = new Date(whereDate);
    nextDay.setDate(nextDay.getDate() + 1);

    return this.prisma.order.findMany({
      where: {
        customer: { tenantId },
        createdAt: { gte: whereDate, lt: nextDay },
      },
      include: {
        customer: { select: { name: true, cpf: true, balance: true, isBlocked: true } },
        items: {
          include: {
            meal: { select: { name: true } },
            options: { include: { option: { select: { name: true, price: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, customer: { tenantId } },
      include: {
        customer: true,
        items: {
          include: {
            meal: true,
            options: { include: { option: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return order;
  }

  async create(tenantId: string, dto: CreateOrderDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    // Calculate total
    let totalAmount = 0;
    const itemsData = [];

    for (const item of dto.items) {
      const meal = await this.prisma.meal.findFirst({ where: { id: item.mealId, tenantId } });
      if (!meal) throw new NotFoundException(`Marmita ${item.mealId} não encontrada`);

      let itemPrice = Number(meal.basePrice);
      const optionsData = [];

      if (item.options?.length) {
        for (const opt of item.options) {
          const option = await this.prisma.option.findUnique({ where: { id: opt.optionId } });
          if (option) {
            itemPrice += Number(option.price);
            optionsData.push({ optionId: opt.optionId });
          }
        }
      }

      totalAmount += itemPrice * item.quantity;
      itemsData.push({ mealId: item.mealId, quantity: item.quantity, unitPrice: itemPrice, options: optionsData });
    }

    const discount = await this.discounts.calculateDiscount(tenantId, totalAmount);
    const finalAmount = totalAmount - discount;

    const hasFunds = Number(customer.balance) >= finalAmount;

    const order = await this.prisma.order.create({
      data: {
        customerId: dto.customerId,
        totalAmount: finalAmount,
        discount,
        status: hasFunds ? 'PENDING' : 'CONFIRMED', // CONFIRMED = aguardando pagamento
        items: {
          create: itemsData.map((item) => ({
            mealId: item.mealId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            options: { create: item.options },
          })),
        },
      },
      include: {
        items: { include: { options: { include: { option: true } }, meal: true } },
        customer: true,
      },
    });

    return { ...order, pendingPayment: !hasFunds, missing: hasFunds ? 0 : finalAmount - Number(customer.balance) };
  }

  async approveOrder(id: string, tenantId: string, actor: Actor) {
    const order = await this.findOne(id, tenantId);
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) throw new BadRequestException('Pedido não pode ser aprovado');

    const customer = order.customer as any;
    const total = Number(order.totalAmount);

    await this.prisma.$transaction([
      this.prisma.walletTransaction.create({
        data: { customerId: customer.id, type: 'DEBIT', amount: total, description: `Aprovado pelo admin #${id.slice(-6)}` },
      }),
      this.prisma.customer.update({
        where: { id: customer.id },
        data: { balance: { decrement: total } },
      }),
      this.prisma.order.update({
        where: { id },
        data: { status: 'PICKED_UP', pickedUp: true, pickedUpAt: new Date() },
      }),
    ]);

    await this.auditLogs.log({
      tenantId,
      actor,
      action: 'APPROVE_ORDER',
      targetId: id,
      targetType: 'ORDER',
      metadata: { orderId: id, customerId: customer.id, customerName: customer.name, amount: total },
    });

    return this.findOne(id, tenantId);
  }

  async cancelOrder(id: string, tenantId: string, actor: Actor) {
    const order = await this.findOne(id, tenantId);
    if (order.status === 'PICKED_UP') throw new BadRequestException('Pedido já foi retirado');
    if (order.status === 'CANCELLED') throw new BadRequestException('Pedido já está cancelado');

    const result = await this.prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } });

    const customer = order.customer as any;
    await this.auditLogs.log({
      tenantId,
      actor,
      action: 'CANCEL_ORDER',
      targetId: id,
      targetType: 'ORDER',
      metadata: { orderId: id, customerId: customer.id, customerName: customer.name, amount: Number(order.totalAmount) },
    });

    return result;
  }

  async confirmPickup(id: string, tenantId: string) {
    const order = await this.findOne(id, tenantId);
    if (order.status === 'PICKED_UP') throw new BadRequestException('Pedido já foi retirado');

    const customer = order.customer as any;
    const total = Number(order.totalAmount);
    if (Number(customer.balance) < total) {
      throw new BadRequestException(`Saldo insuficiente. Faltam R$${(total - Number(customer.balance)).toFixed(2)}`);
    }

    await this.wallet.debit(customer.id, total, `Retirada pedido #${id.slice(-6)}`);

    // Reset no-show counter when customer picks up
    if (customer.noShowCount > 0) {
      await this.prisma.customer.update({ where: { id: customer.id }, data: { noShowCount: 0 } });
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: 'PICKED_UP', pickedUp: true, pickedUpAt: new Date() },
    });
  }

  async lookupCheckout(tenantId: string, cpf?: string, customerId?: string) {
    let customer: any;

    if (cpf) {
      customer = await this.prisma.customer.findUnique({ where: { tenantId_cpf: { tenantId, cpf } } });
    } else if (customerId) {
      customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId } });
    }

    if (!customer) throw new NotFoundException('Cliente não encontrado');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await this.prisma.order.findMany({
      where: {
        customerId: customer.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        createdAt: { gte: today, lt: tomorrow },
      },
      include: {
        items: {
          include: {
            meal: { select: { name: true } },
            options: { include: { option: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalDue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const balance = Number(customer.balance);
    const canPickup = balance >= totalDue;
    const missing = canPickup ? 0 : totalDue - balance;

    return { customer, orders, totalDue, canPickup, missing };
  }

  async forcePickup(id: string, tenantId: string, actor: Actor) {
    const order = await this.findOne(id, tenantId);
    if (order.status === 'PICKED_UP') throw new BadRequestException('Pedido já foi retirado');
    if (order.status === 'CANCELLED') throw new BadRequestException('Pedido está cancelado');

    const customer = order.customer as any;
    const total = Number(order.totalAmount);

    await this.prisma.$transaction([
      this.prisma.walletTransaction.create({
        data: { customerId: customer.id, type: 'DEBIT', amount: total, description: `Retirada forçada pelo admin #${id.slice(-6)}` },
      }),
      this.prisma.customer.update({
        where: { id: customer.id },
        data: { balance: { decrement: total } },
      }),
      this.prisma.order.update({
        where: { id },
        data: { status: 'PICKED_UP', pickedUp: true, pickedUpAt: new Date() },
      }),
    ]);

    await this.auditLogs.log({
      tenantId,
      actor,
      action: 'FORCE_PICKUP',
      targetId: id,
      targetType: 'ORDER',
      metadata: { orderId: id, customerId: customer.id, customerName: customer.name, amount: total, balanceBefore: Number(customer.balance) },
    });

    return this.findOne(id, tenantId);
  }

  async confirmPickupByCpf(cpf: string, tenantId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { tenantId_cpf: { tenantId, cpf } },
    });
    if (!customer) throw new NotFoundException('CPF não encontrado');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await this.prisma.order.findMany({
      where: {
        customerId: customer.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        createdAt: { gte: today, lt: tomorrow },
      },
    });

    if (!orders.length) throw new NotFoundException('Nenhum pedido pendente encontrado para hoje');

    const totalDue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    if (Number(customer.balance) < totalDue) {
      const missing = (totalDue - Number(customer.balance)).toFixed(2);
      throw new BadRequestException(`Saldo insuficiente. Faltam R$${missing}`);
    }

    await this.wallet.debit(customer.id, totalDue, `Retirada balcão CPF`);

    await this.prisma.order.updateMany({
      where: { id: { in: orders.map((o) => o.id) } },
      data: { status: 'PICKED_UP', pickedUp: true, pickedUpAt: new Date() },
    });

    return { message: 'Retirada confirmada', ordersConfirmed: orders.length };
  }

  async getMyOrders(customerId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.order.findMany({
      where: { customerId, createdAt: { gte: today, lt: tomorrow } },
      include: {
        items: {
          include: {
            meal: { select: { name: true } },
            options: { include: { option: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyOrderHistory(customerId: string, limit = 20, offset = 0) {
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId },
        include: {
          items: {
            include: {
              meal: { select: { name: true } },
              options: { include: { option: { select: { name: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.order.count({ where: { customerId } }),
    ]);

    return { orders, total, limit, offset };
  }

  async getDashboard(tenantId: string) {
    // Detect and mark no-shows before building dashboard
    await this.detectAndMarkNoShows(tenantId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const where = { customer: { tenantId }, createdAt: { gte: today, lt: tomorrow } };
    const whereMonth = { customer: { tenantId }, createdAt: { gte: monthStart, lt: monthEnd } };

    const [ordersToday, pickedUpToday, pendingPickup, pendingPayment, revenueResult, problemOrders, monthlyRevenueResult, monthlyPickedUp, walletSummary] =
      await Promise.all([
        this.prisma.order.count({ where }),
        this.prisma.order.count({ where: { ...where, status: 'PICKED_UP' } }),
        this.prisma.order.count({ where: { ...where, status: 'PENDING' } }),
        this.prisma.order.count({ where: { ...where, status: 'CONFIRMED' } }),
        this.prisma.order.aggregate({
          where: { ...where, status: 'PICKED_UP' },
          _sum: { totalAmount: true },
        }),
        this.prisma.order.findMany({
          where: { ...where, status: 'CONFIRMED' },
          include: { customer: { select: { name: true, cpf: true, balance: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.order.aggregate({
          where: { ...whereMonth, status: 'PICKED_UP' },
          _sum: { totalAmount: true },
        }),
        this.prisma.order.count({ where: { ...whereMonth, status: 'PICKED_UP' } }),
        this.prisma.customer.aggregate({
          where: { tenantId },
          _sum: { balance: true },
        }),
      ]);

    const debtorsCount = await this.prisma.customer.count({ where: { tenantId, balance: { lt: 0 } } });

    return {
      ordersToday,
      pickedUpToday,
      pendingPickup,
      pendingPayment,
      totalRevenue: revenueResult._sum.totalAmount || 0,
      problemOrders,
      monthlyRevenue: monthlyRevenueResult._sum.totalAmount || 0,
      monthlyPickedUp,
      totalSystemBalance: walletSummary._sum.balance || 0,
      debtorsCount,
    };
  }

  async incrementCustomerNoShowCount(customerId: string, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    const discountRule = await this.prisma.discountRule.findUnique({ where: { tenantId } });
    const maxNoShows = discountRule?.maxNoShowsBeforeBlock || 3;

    const newCount = (customer.noShowCount || 0) + 1;
    const isBlocked = newCount >= maxNoShows;

    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        noShowCount: newCount,
        isBlocked,
        lastNoShowAt: new Date(),
        blockReason: isBlocked ? 'Múltiplas não-retiradas' : null,
      },
    });
  }

  async detectAndMarkNoShows(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find orders created today but not picked up yet
    const unpickedOrders = await this.prisma.order.findMany({
      where: {
        customer: { tenantId },
        createdAt: { gte: today, lt: tomorrow },
        status: { not: 'PICKED_UP' },
      },
      include: { customer: true },
    });

    // For each unpicked order, increment customer no-show count
    for (const order of unpickedOrders) {
      await this.incrementCustomerNoShowCount(order.customerId, tenantId);
    }
  }
}
