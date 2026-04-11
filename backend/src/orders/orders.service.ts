import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountsService } from '../discounts/discounts.service';
import { WalletService } from '../wallet/wallet.service';
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
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private discounts: DiscountsService,
    private wallet: WalletService,
  ) {}

  async findAll(tenantId: string, date?: string) {
    const whereDate = date ? new Date(date) : (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
    const nextDay = new Date(whereDate);
    nextDay.setDate(nextDay.getDate() + 1);

    return this.prisma.order.findMany({
      where: {
        customer: { tenantId },
        createdAt: { gte: whereDate, lt: nextDay },
      },
      include: {
        customer: { select: { name: true, cpf: true } },
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

  async confirmPickup(id: string, tenantId: string) {
    const order = await this.findOne(id, tenantId);
    if (order.status === 'PICKED_UP') throw new BadRequestException('Pedido já foi retirado');

    const customer = order.customer as any;
    const total = Number(order.totalAmount);
    if (Number(customer.balance) < total) {
      throw new BadRequestException(`Saldo insuficiente. Faltam R$${(total - Number(customer.balance)).toFixed(2)}`);
    }

    await this.wallet.debit(customer.id, total, `Retirada pedido #${id.slice(-6)}`);

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

  async getDashboard(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const where = { customer: { tenantId }, createdAt: { gte: today, lt: tomorrow } };
    const whereMonth = { customer: { tenantId }, createdAt: { gte: monthStart, lt: monthEnd } };

    const [ordersToday, pickedUpToday, pendingPickup, pendingPayment, revenueResult, problemOrders, monthlyRevenueResult, monthlyPickedUp] =
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
      ]);

    return {
      ordersToday,
      pickedUpToday,
      pendingPickup,
      pendingPayment,
      totalRevenue: revenueResult._sum.totalAmount || 0,
      problemOrders,
      monthlyRevenue: monthlyRevenueResult._sum.totalAmount || 0,
      monthlyPickedUp,
    };
  }
}
