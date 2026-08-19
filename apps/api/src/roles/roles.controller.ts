import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionCode, RoleDTO, RoleName } from '@inventario/types';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo de roles con permisos' })
  async findAll(): Promise<RoleDTO[]> {
    const roles = await this.prisma.role.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: { permissions: { include: { permission: true } } },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name as RoleName,
      description: r.description,
      active: r.active,
      permissions: r.permissions.map((p) => p.permission.code) as PermissionCode[],
    }));
  }
}