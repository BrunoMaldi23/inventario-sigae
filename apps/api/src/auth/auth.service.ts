import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { AuthUser, LoginResponse, PermissionCode, RoleName } from '@inventario/types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { conflict, invalidData, unauthorized } from '../common/exceptions/business.exception';
import { ChangePasswordDto, UpdateProfileDto } from './dto/auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

type UserRole = {
  name: string;
  permissions: { permission: { code: string } }[];
};

type SessionUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  roleId: string;
  role: UserRole;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
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

    return this.buildTokens(user, ip, userAgent);
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

    return this.buildTokens(stored.user, ip);
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

    return this.serializeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<AuthUser> {
    const existing = await this.prisma.user.findFirst({
      where: { id: userId, active: true, deletedAt: null },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
    if (!existing) throw unauthorized('Usuario no encontrado');

    const data: { name?: string; email?: string } = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw invalidData('El nombre no puede quedar vacío');
      data.name = name;
    }
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      const duplicate = await this.prisma.user.findUnique({ where: { email } });
      if (duplicate && duplicate.id !== userId && !duplicate.deletedAt) {
        throw conflict('Ya existe un usuario con ese correo');
      }
      data.email = email;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    await this.audit.diff(
      userId,
      'USER_PROFILE_UPDATE',
      'User',
      userId,
      { email: existing.email, name: existing.name },
      { email: user.email, name: user.name },
      { performedById: userId },
    );

    return this.serializeUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, active: true, deletedAt: null },
    });
    if (!user) throw unauthorized('Usuario no encontrado');

    const currentTrimmed = dto.currentPassword.trim();
    const valid =
      (await argon2.verify(user.passwordHash, dto.currentPassword)) ||
      (currentTrimmed !== dto.currentPassword && (await argon2.verify(user.passwordHash, currentTrimmed)));
    if (!valid) throw unauthorized('La contraseña actual no es válida');

    const newPassword = dto.newPassword.trim();
    if (newPassword.length < 6) {
      throw invalidData('La nueva contraseña debe tener al menos 6 caracteres');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await argon2.hash(newPassword) },
    });

    await this.audit.write({
      userId,
      action: 'USER_PASSWORD_CHANGE',
      entityType: 'User',
      entityId: userId,
      metadata: { performedById: userId },
    });

    return { success: true };
  }

  async updateAvatar(userId: string, file?: Express.Multer.File): Promise<AuthUser> {
    if (!file) throw invalidData('Debe seleccionar una imagen');
    if (!file.mimetype.startsWith('image/')) {
      throw invalidData('El avatar debe ser una imagen');
    }

    const existing = await this.prisma.user.findFirst({
      where: { id: userId, active: true, deletedAt: null },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
    if (!existing) throw unauthorized('Usuario no encontrado');

    const stored = await this.storage.save(file.buffer, `users/${userId}/avatar`, file.originalname);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: stored.url, avatarKey: stored.key },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (existing.avatarKey) {
      this.storage.remove(existing.avatarKey);
    }

    await this.audit.write({
      userId,
      action: 'USER_AVATAR_UPDATE',
      entityType: 'User',
      entityId: userId,
      metadata: { filename: file.originalname, size: file.size },
    });

    return this.serializeUser(user);
  }

  private async buildTokens(
    user: SessionUser,
    ip?: string,
    userAgent?: string,
  ): Promise<LoginResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      role: user.role.name,
    };
    const accessToken = await this.jwt.signAsync(payload);

    const rttlDays = Number(this.config.get('JWT_REFRESH_TTL_DAYS') ?? 7);
    const refreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + rttlDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: this.serializeUser(user),
    };
  }

  private serializeUser(user: SessionUser): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      roleId: user.roleId,
      role: user.role.name as RoleName,
      permissions: user.role.permissions.map((rp) => rp.permission.code) as PermissionCode[],
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
