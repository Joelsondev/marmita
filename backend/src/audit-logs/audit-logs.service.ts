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

  async findAll(tenantId: string, limit = 50, offset = 0) {
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where: { tenantId } }),
    ]);
    return { logs, total, limit, offset };
  }

  async findByAction(tenantId: string, action: string, limit = 50, offset = 0) {
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { tenantId, action: action as any },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where: { tenantId, action: action as any } }),
    ]);
    return { logs, total, limit, offset };
  }
}
