import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { AuthUser, LoginResponse, PermissionCode, RoleName } from '@inventario/types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { unauthorized } from '../common/exceptions/business.exception';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async login(
    email: string,
    password: string,
    ip?: string,
    userAgent?: string,
  ): Promise<LoginResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, active: true, deletedAt: null },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!user) {
      throw unauthorized('Credenciales inválidas');
    }

    const trimmedPassword = password.trim();
    const valid =
      (await argon2.verify(user.passwordHash, password)) ||
      (trimmedPassword !== password && (await argon2.verify(user.passwordHash, trimmedPassword)));
    if (!valid) {
      await this.audit.write({
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        metadata: { ip, userAgent },
      });
      throw unauthorized('Credenciales inválidas');
    }

    await this.audit.write({
      userId: user.id,
      action: 'AUTH_LOGIN',
      entityType: 'User',
      entityId: user.id,
      metadata: { ip, userAgent },
    });

    return this.buildTokens(user.id, normalizedEmail, user.name, user.roleId, user.role.name, user.role, ip, userAgent);
  }

  async refresh(refreshToken: string, ip?: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || !stored.user.active) {
      throw unauthorized('Sesión expirada o inválida');
    }

    // Rotación: revocar token anterior y emitir nuevo par.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.buildTokens(
      stored.user.id,
      stored.user.email,
      stored.user.name,
      stored.user.roleId,
      stored.user.role.name,
      stored.user.role,
      ip,
    );
  }

  async logout(refreshToken: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true };
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, active: true, deletedAt: null },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!user) {
      throw unauthorized('Usuario no encontrado');
    }

return {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      role: user.role.name as RoleName,
      permissions: user.role.permissions.map((rp) => rp.permission.code) as PermissionCode[],
    };
  }

  private async buildTokens(
    id: string,
    email: string,
    name: string,
    roleId: string,
    roleName: string,
    role: { permissions: { permission: { code: string } }[] },
    ip?: string,
    userAgent?: string,
  ): Promise<LoginResponse> {
    const payload: JwtPayload = { sub: id, email, name, roleId, role: roleName };
    const accessToken = await this.jwt.signAsync(payload);

    const rttlDays = Number(this.config.get('JWT_REFRESH_TTL_DAYS') ?? 7);
    const refreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + rttlDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      },
    });

return {
      accessToken,
      refreshToken,
      user: {
        id,
        email,
        name,
        roleId,
        role: roleName as RoleName,
        permissions: role.permissions.map((rp) => rp.permission.code) as PermissionCode[],
      },
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
