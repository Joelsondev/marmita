import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
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

  private formatTenant(t: any) {
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      email: t.email,
      document: t.document,
      createdAt: t.createdAt,
      customersCount: t._count.customers,
      mealsCount: t._count.meals,
      subscription: this.calcSubscription(t.subscription),
    };
  }

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        subscription: true,
        _count: { select: { customers: true, meals: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map((t) => this.formatTenant(t));
  }

  async getInadimplentes() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        subscription: true,
        _count: { select: { customers: true, meals: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    return tenants
      .map((t) => this.formatTenant(t))
      .filter((t) => {
        const sub = t.subscription;
        if (!sub) return false;
        return (
          sub.status === 'blocked' ||
          sub.status === 'past_due' ||
          (sub.status === 'trial' && sub.daysUntilExpiry !== null && sub.daysUntilExpiry <= 0)
        );
      });
  }

  async getTenant(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
        _count: { select: { customers: true, meals: true } },
      },
    });
    if (!t) throw new NotFoundException('Marmitaria não encontrada');
    return this.formatTenant(t);
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

  async blockTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Marmitaria não encontrada');

    const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!sub) throw new BadRequestException('Marmitaria sem assinatura');

    const updated = await this.prisma.subscription.update({
      where: { tenantId },
      data: { status: 'blocked' },
    });

    return { message: 'Marmitaria bloqueada com sucesso', subscription: this.calcSubscription(updated) };
  }

  async unblockTenant(tenantId: string, plan: 'monthly' | 'quarterly' | 'annual', durationDays?: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Marmitaria não encontrada');

    const now = new Date();
    const days = durationDays ?? (plan === 'monthly' ? 30 : plan === 'quarterly' ? 90 : 365);
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + days);
    const graceEnd = new Date(periodEnd);
    graceEnd.setDate(graceEnd.getDate() + 1);

    const sub = await this.prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId, plan, status: 'active',
        trialEndsAt: now,
        currentPeriodEnd: periodEnd,
        gracePeriodEnd: graceEnd,
      },
      update: {
        plan, status: 'active',
        currentPeriodEnd: periodEnd,
        gracePeriodEnd: graceEnd,
      },
    });

    return { message: 'Marmitaria desbloqueada com sucesso', subscription: this.calcSubscription(sub) };
  }

  async extendTrial(tenantId: string, days: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Marmitaria não encontrada');

    const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });

    const baseDate = sub?.status === 'trial' && sub.trialEndsAt > new Date()
      ? sub.trialEndsAt
      : new Date();

    const newTrialEnd = new Date(baseDate);
    newTrialEnd.setDate(newTrialEnd.getDate() + days);

    const updated = await this.prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId, plan: 'monthly', status: 'trial',
        trialEndsAt: newTrialEnd,
      },
      update: {
        status: 'trial',
        trialEndsAt: newTrialEnd,
        currentPeriodEnd: null,
        gracePeriodEnd: null,
      },
    });

    return { message: `Trial estendido por ${days} dia(s)`, subscription: this.calcSubscription(updated) };
  }

  async impersonateTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { admins: { take: 1 } },
    });
    if (!tenant) throw new NotFoundException('Marmitaria não encontrada');
    if (!tenant.admins.length) throw new BadRequestException('Marmitaria sem administrador');

    const admin = tenant.admins[0];
    const payload = { sub: admin.id, tenantId: tenant.id, role: 'admin', impersonated: true };

    return {
      token: this.jwt.sign(payload, { expiresIn: '2h' }),
      admin: { id: admin.id, name: admin.name, email: admin.email, tenantId: tenant.id, tenantName: tenant.name, tenantSlug: tenant.slug },
      warning: 'Token de impersonação válido por 2 horas',
    };
  }
}
