import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type SubscriptionInfo = {
  status: string;
  plan: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  gracePeriodEnd: Date | null;
  daysUntilExpiry: number | null;
  isBlocked: boolean;
  alertDaysLeft: number | null; // non-null when <= 10 days to expiry
};

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  /** Cria assinatura trial ao registrar tenant */
  async createTrial(tenantId: string) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    return this.prisma.subscription.create({
      data: { tenantId, status: 'trial', plan: 'monthly', trialEndsAt },
    });
  }

  /** Retorna status calculado da assinatura */
  async getInfo(tenantId: string): Promise<SubscriptionInfo> {
    const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });

    if (!sub) {
      // tenant legado sem assinatura — considera trial expirado mas não bloqueia
      return {
        status: 'trial', plan: 'monthly',
        trialEndsAt: null, currentPeriodEnd: null, gracePeriodEnd: null,
        daysUntilExpiry: null, isBlocked: false, alertDaysLeft: null,
      };
    }

    const now = new Date();

    // ── Trial ──────────────────────────────────────────────────────────────────
    if (sub.status === 'trial') {
      const diff = Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / 86_400_000);
      const expired = diff < 0;
      return {
        status: 'trial', plan: sub.plan,
        trialEndsAt: sub.trialEndsAt,
        currentPeriodEnd: null, gracePeriodEnd: null,
        daysUntilExpiry: expired ? 0 : diff,
        isBlocked: expired,
        alertDaysLeft: diff <= 2 && !expired ? diff : null,
      };
    }

    // ── Active / Past due ──────────────────────────────────────────────────────
    if (sub.status === 'active' || sub.status === 'past_due') {
      const periodEnd   = sub.currentPeriodEnd!;
      const graceEnd    = sub.gracePeriodEnd!;
      const daysToEnd   = Math.ceil((periodEnd.getTime() - now.getTime()) / 86_400_000);
      const pastGrace   = now > graceEnd;

      return {
        status: sub.status, plan: sub.plan,
        trialEndsAt: sub.trialEndsAt,
        currentPeriodEnd: periodEnd,
        gracePeriodEnd: graceEnd,
        daysUntilExpiry: daysToEnd < 0 ? 0 : daysToEnd,
        isBlocked: pastGrace,
        alertDaysLeft: daysToEnd <= 10 && daysToEnd >= 0 ? daysToEnd : null,
      };
    }

    // ── Blocked ────────────────────────────────────────────────────────────────
    return {
      status: 'blocked', plan: sub.plan,
      trialEndsAt: sub.trialEndsAt,
      currentPeriodEnd: sub.currentPeriodEnd,
      gracePeriodEnd: sub.gracePeriodEnd,
      daysUntilExpiry: 0,
      isBlocked: true,
      alertDaysLeft: null,
    };
  }

  /** Guard helper — lança ForbiddenException se bloqueado */
  async assertActive(tenantId: string) {
    const info = await this.getInfo(tenantId);
    if (info.isBlocked) {
      throw new ForbiddenException({
        message: 'Acesso bloqueado. Regularize sua assinatura para continuar.',
        subscriptionBlocked: true,
      });
    }
  }

  /** Ativa plano (simula pagamento) */
  async activate(tenantId: string, plan: 'monthly' | 'quarterly' | 'annual') {
    const now   = new Date();
    const days  = plan === 'monthly' ? 30 : plan === 'quarterly' ? 90 : 365;
    const periodEnd  = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + days);
    const graceEnd = new Date(periodEnd);
    graceEnd.setDate(graceEnd.getDate() + 1);

    return this.prisma.subscription.upsert({
      where:  { tenantId },
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
  }
}
