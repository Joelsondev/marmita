import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SuperAdminService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(email: string, password: string) {
    const sa = await this.prisma.superAdmin.findUnique({ where: { email } });
    if (!sa) throw new UnauthorizedException('Credenciais inválidas');
    const valid = await bcrypt.compare(password, sa.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    const payload = { sub: sa.id, role: 'superadmin' };
    return {
      token: this.jwt.sign(payload),
      superAdmin: { id: sa.id, name: sa.name, email: sa.email },
    };
  }

  private calcSubscription(sub: any) {
    if (!sub) return null;
    const now = new Date();

    const expiresAt = sub.status === 'trial'
      ? sub.trialEndsAt
      : (sub.currentPeriodEnd ?? null);

    const daysUntilExpiry = expiresAt
      ? Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86_400_000)
      : null;

    const graceEnd = sub.status === 'trial'
      ? sub.trialEndsAt
      : (sub.gracePeriodEnd ?? sub.currentPeriodEnd);

    const isBlocked = graceEnd ? now > new Date(graceEnd) : false;
    const status = isBlocked ? 'blocked' : sub.status;

    return { plan: sub.plan, status, expiresAt, daysUntilExpiry, isBlocked };
  }

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        subscription: true,
        _count: { select: { customers: true, meals: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      email: t.email,
      document: t.document,
      createdAt: t.createdAt,
      customersCount: t._count.customers,
      mealsCount: t._count.meals,
      subscription: this.calcSubscription(t.subscription),
    }));
  }

  async updateSubscription(
    tenantId: string,
    plan: 'monthly' | 'quarterly' | 'annual',
    status: 'trial' | 'active' | 'past_due' | 'blocked',
    durationDays?: number,
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Marmitaria não encontrada');

    const now = new Date();

    // Calcular datas baseado no plano, se não informado manualmente
    const days = durationDays ?? (plan === 'monthly' ? 30 : plan === 'quarterly' ? 90 : 365);
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + days);
    const graceEnd = new Date(periodEnd);
    graceEnd.setDate(graceEnd.getDate() + 1);

    const trialEndsAt = status === 'trial' ? periodEnd : now;

    const sub = await this.prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId, plan, status,
        trialEndsAt,
        currentPeriodEnd: status !== 'trial' ? periodEnd : null,
        gracePeriodEnd:   status !== 'trial' ? graceEnd  : null,
      },
      update: {
        plan, status,
        trialEndsAt: status === 'trial' ? periodEnd : undefined,
        currentPeriodEnd: status !== 'trial' ? periodEnd : null,
        gracePeriodEnd:   status !== 'trial' ? graceEnd  : null,
      },
    });

    return { ...sub, subscription: this.calcSubscription(sub) };
  }
}
