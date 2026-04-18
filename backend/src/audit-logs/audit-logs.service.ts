import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AuditActor = {
  id: string;
  role: string;
};

type LogPayload = {
  tenantId: string;
  actor: AuditActor;
  action: 'APPROVE_ORDER' | 'FORCE_PICKUP' | 'CANCEL_ORDER' | 'ADD_CREDIT';
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, any>;
};

type FindParams = {
  tenantId: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  private async resolveActorName(actorId: string, actorRole: string): Promise<string> {
    if (actorRole === 'admin') {
      const admin = await this.prisma.admin.findUnique({ where: { id: actorId }, select: { name: true } });
      return admin?.name ?? 'Admin';
    }
    if (actorRole === 'operator') {
      const op = await this.prisma.operator.findUnique({ where: { id: actorId }, select: { name: true } });
      return op?.name ?? 'Operador';
    }
    return 'Sistema';
  }

  async log(payload: LogPayload): Promise<void> {
    const actorName = await this.resolveActorName(payload.actor.id, payload.actor.role);

    await this.prisma.auditLog.create({
      data: {
        tenantId: payload.tenantId,
        actorId: payload.actor.id,
        actorRole: payload.actor.role,
        actorName,
        action: payload.action,
        targetId: payload.targetId,
        targetType: payload.targetType,
        metadata: payload.metadata ?? {},
      },
    });
  }

  async find({ tenantId, action, dateFrom, dateTo, limit = 50, offset = 0 }: FindParams) {
    const where: any = { tenantId };

    if (action) where.action = action;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(`${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(`${dateTo}T23:59:59`);
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total, limit, offset };
  }
}
