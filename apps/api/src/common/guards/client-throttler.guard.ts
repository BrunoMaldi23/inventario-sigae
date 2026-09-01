import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthUser } from '@inventario/types';
import type { Request } from 'express';

type AuthenticatedRequest = Request & {
  user?: Pick<AuthUser, 'id'>;
};

@Injectable()
export class ClientThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: AuthenticatedRequest): Promise<string> {
    if (req.user?.id) return `user:${req.user.id}`;
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}
