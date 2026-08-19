import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Auditoría inmutable. Se escribe SOLO desde el backend y nunca
 * se expone endpoint que permita modificar/borrar registros.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  write(entry: AuditEntry, tx?: Prisma.TransactionClient) {
    const exec = tx ?? this.prisma;
    return exec.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldValues: entry.oldValues ? (entry.oldValues as Prisma.InputJsonValue) : undefined,
        newValues: entry.newValues ? (entry.newValues as Prisma.InputJsonValue) : undefined,
        metadata: entry.metadata ? (entry.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  /** Registra un cambio de valores comparando old/new. */
  async diff(
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    oldValues: object | null,
    newValues: object | null,
    metadata?: Record<string, unknown>,
    tx?: Prisma.TransactionClient,
  ) {
    const oldSanitized = this.sanitize(oldValues);
    const newSanitized = this.sanitize(newValues);
    await this.write(
      { userId, action, entityType, entityId, oldValues: oldSanitized, newValues: newSanitized, metadata },
      tx,
    );
  }

  private sanitize(values: object | null | undefined): Record<string, unknown> | null {
    if (!values || typeof values !== 'object') {
      return values ? { value: values } : null;
    }
    const src = values as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      if (v === null || v === undefined || v === '') continue;
      if (typeof v === 'object' && (v as { id?: unknown }).id) {
        out[k] = {
          id: (v as { id: unknown }).id,
          name:
            (v as { name?: unknown }).name ?? (v as { email?: unknown }).email ?? null,
        };
      } else {
        out[k] = v;
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  }
}