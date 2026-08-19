import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditLogDTO, Paginated } from '@inventario/types';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/pagination/pagination';
import { QueryAuditDto } from './dto/audit.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAuditDto): Promise<Paginated<AuditLogDTO>> {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.action) where.action = query.action;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
const dateFilter: Prisma.DateTimeFilter = {};
    if (query.from) dateFilter.gte = new Date(query.from);
    if (query.to) dateFilter.lte = new Date(query.to);
    if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;

    const result = await paginate(
      this.prisma.auditLog,
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      query.page,
      query.pageSize,
    );

const items = result.items.map((l: any) => ({
      id: l.id,
      userId: l.userId,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      oldValues: l.oldValues as Record<string, unknown> | null,
      newValues: l.newValues as Record<string, unknown> | null,
      metadata: l.metadata as Record<string, unknown> | null,
      createdAt: l.createdAt.toISOString(),
      user: l.user
        ? {
            id: l.user.id,
            email: l.user.email,
            name: l.user.name,
            roleId: '',
            active: true,
            createdAt: '',
            updatedAt: '',
          }
        : null,
    })) as AuditLogDTO[];

    return { items, meta: result.meta };
  }

  /** Acciones disponibles (para filtros UI). */
  async distinctActions(): Promise<string[]> {
    const rows = await this.prisma.auditLog.groupBy({ by: ['action'] });
    return rows.map((r) => r.action).sort();
  }
}
