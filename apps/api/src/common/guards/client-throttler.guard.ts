import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthUser } from '@inventario/types';
import type { Request } from 'express';

type AuthenticatedRequest = Request & {
  user?: Pick<AuthUser, 'id'>;
};

function getUserIdFromBearer(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;

  const [, payload] = auth.slice('Bearer '.length).split('.');
  if (!payload) return null;

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const parsed = JSON.parse(Buffer.from(normalizedPayload, 'base64').toString('utf8')) as { sub?: unknown };
    return typeof parsed.sub === 'string' && parsed.sub.length > 0 ? parsed.sub : null;
  } catch {
    return null;
  }
}

@Injectable()
export class ClientThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: AuthenticatedRequest): Promise<string> {
    if (req.user?.id) return `user:${req.user.id}`;
    const tokenUserId = getUserIdFromBearer(req);
    if (tokenUserId) return `user:${tokenUserId}`;
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}
