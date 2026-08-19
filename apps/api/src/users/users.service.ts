import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { Paginated, PermissionCode, RoleName, UserDTO } from '@inventario/types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { conflict, notFound } from '../common/exceptions/business.exception';
import { paginate } from '../common/pagination/pagination';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const userInclude = { role: { include: { permissions: { include: { permission: true } } } } };

function serialize(user: any): UserDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleId: user.roleId,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    role: {
      id: user.role.id,
      name: user.role.name as RoleName,
      description: user.role.description,
      active: user.role.active,
      permissions: user.role.permissions.map((rp: any) => rp.permission.code) as PermissionCode[],
    },
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(page: number, pageSize: number, search?: string): Promise<Paginated<UserDTO>> {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const result = await paginate(this.prisma.user, { where, include: userInclude, orderBy: { createdAt: 'desc' } }, page, pageSize);
    return { items: result.items.map(serialize), meta: result.meta };
  }

  async findOne(id: string): Promise<UserDTO> {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, include: userInclude });
    if (!user) throw notFound('Usuario no encontrado');
    return serialize(user);
  }

  async create(dto: CreateUserDto, performedById: string): Promise<UserDTO> {
    const email = dto.email.trim().toLowerCase();

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw conflict('Ya existe un usuario con ese correo');

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw notFound('Rol no encontrado');

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name,
        passwordHash,
        roleId: dto.roleId,
      },
      include: userInclude,
    });

    await this.audit.diff(
      performedById,
      'USER_CREATE',
      'User',
      user.id,
      null,
      { email: user.email, name: user.name, roleId: user.roleId },
      { performedById },
    );

    return serialize(user);
  }

  async update(id: string, dto: UpdateUserDto, performedById: string): Promise<UserDTO> {
    const existing = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, include: userInclude });
    if (!existing) throw notFound('Usuario no encontrado');

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      const dup = await this.prisma.user.findUnique({ where: { email } });
      if (dup && dup.id !== id) throw conflict('Ya existe un usuario con ese correo');
      data.email = email;
    }
    if (dto.roleId !== undefined) {
      const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (!role) throw notFound('Rol no encontrado');
      data.role = { connect: { id: dto.roleId } };
    }
    if (dto.password) {
      data.passwordHash = await argon2.hash(dto.password);
    }
    if (dto.active !== undefined) data.active = dto.active;

    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: userInclude,
    });

    await this.audit.diff(
      performedById,
      'USER_UPDATE',
      'User',
      id,
      serialize(existing),
      serialize(user),
      { performedById },
    );

    return serialize(user);
  }

  async deactivate(id: string, performedById: string): Promise<UserDTO> {
    const existing = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, include: userInclude });
    if (!existing) throw notFound('Usuario no encontrado');
    if (id === performedById) {
      throw conflict('No puede desactivar su propia cuenta');
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
      include: userInclude,
    });

    await this.audit.diff(performedById, 'USER_DEACTIVATE', 'User', id, { active: true }, { active: false });
    return serialize(user);
  }
}
