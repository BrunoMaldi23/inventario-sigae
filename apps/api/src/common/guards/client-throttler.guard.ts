import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import type { AuthUser } from '@inventario/types';
import type { Request } from 'express';

type AuthenticatedRequest = Request & {
  user?: Pick<AuthUser, 'id'>;
};

@Injectable()
export class ClientThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwt: JwtService,
  ) {
    super(options, storageService, reflector);
  }

  protected override async getTracker(req: AuthenticatedRequest): Promise<string> {
    if (req.user?.id) return `user:${req.user.id}`;
    const tokenUserId = await this.getVerifiedUserIdFromBearer(req);
    if (tokenUserId) return `user:${tokenUserId}`;
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private async getVerifiedUserIdFromBearer(req: Request): Promise<string | null> {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return null;

    try {
      const parsed = await this.jwt.verifyAsync<{ sub?: unknown }>(auth.slice('Bearer '.length));
      return typeof parsed.sub === 'string' && parsed.sub.length > 0 ? parsed.sub : null;
    } catch {
      return null;
    }
  }
}
