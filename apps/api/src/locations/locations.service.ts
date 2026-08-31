import { Injectable } from '@nestjs/common';
import { LocationDTO, LocationTreeNode } from '@inventario/types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { conflict, invalidData, notFound } from '../common/exceptions/business.exception';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

function serialize(l: any): LocationDTO {
  return {
    id: l.id,
    name: l.name,
    type: l.type,
    parentId: l.parentId,
    active: l.active,
    description: l.description,
  };
}

/** Ruta jerárquica: "Escuela / Primer piso / 3° B". */
export function locationPath(location: { name: string; parent?: { name: string } | null } | null): string | null {
  if (!location) return null;
  if (location.parent) {
    return `${location.parent.name} / ${location.name}`;
  }
  return location.name;
}

function fullLocationPath(location: { id: string; name: string; parentId?: string | null }, byId: Map<string, { id: string; name: string; parentId?: string | null }>): string {
  const names: string[] = [];
  const seen = new Set<string>();
  let current: { id: string; name: string; parentId?: string | null } | undefined = location;

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    names.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return names.join(' / ');
}

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(): Promise<LocationDTO[]> {
    const all = await this.prisma.location.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    const assetCounts = await this.getActiveAssetCounts(all.map((l) => l.id));
    const byId = new Map(all.map((l) => [l.id, l]));

    return all
      .map((l) => ({
        ...serialize(l),
        path: fullLocationPath(l, byId),
        assetCount: assetCounts.get(l.id) ?? 0,
      }))
      .sort((a, b) => (a.path ?? a.name).localeCompare(b.path ?? b.name, 'es'));
  }

  async findTree(): Promise<LocationTreeNode[]> {
    const all = await this.prisma.location.findMany({
      where: { active: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    const assetCounts = await this.getActiveAssetCounts(all.map((l) => l.id));
    const byId = new Map(all.map((l) => [l.id, l]));

    const map = new Map<string, LocationTreeNode>(
      all.map((l) => [
        l.id,
        {
          ...serialize(l),
          path: fullLocationPath(l, byId),
          assetCount: assetCounts.get(l.id) ?? 0,
          children: [],
        },
      ]),
    );

    const roots: LocationTreeNode[] = [];
    for (const l of all) {
      const node = map.get(l.id)!;
      if (l.parentId && map.has(l.parentId)) {
        map.get(l.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async findOne(id: string): Promise<LocationDTO> {
    const l = await this.prisma.location.findFirst({
      where: { id, active: true },
      include: { parent: true, children: true },
    });
    if (!l) throw notFound('Ubicación no encontrada');
    return { ...serialize(l), path: locationPath(l) };
  }

  async create(dto: CreateLocationDto, performedById: string): Promise<LocationDTO> {
    if (dto.parentId) {
      const parent = await this.prisma.location.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw notFound('Ubicación padre no encontrada');
    }
    try {
      const l = await this.prisma.location.create({
        data: { name: dto.name, type: dto.type, parentId: dto.parentId ?? null, description: dto.description },
      });
      await this.audit.diff(performedById, 'LOCATION_CREATE', 'Location', l.id, null, { name: l.name, type: l.type, parentId: l.parentId });
      return serialize(l);
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2002') {
        throw conflict('Ya existe una ubicación con ese nombre en el mismo nivel');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateLocationDto, performedById: string): Promise<LocationDTO> {
    const existing = await this.prisma.location.findUnique({ where: { id } });
    if (!existing) throw notFound('Ubicación no encontrada');

    if (dto.parentId) {
      if (dto.parentId === id) throw invalidData('Una ubicación no puede ser su propio padre');
      const parent = await this.prisma.location.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw notFound('Ubicación padre no encontrada');
    }

    try {
      const l = await this.prisma.location.update({
        where: { id },
        data: {
          name: dto.name,
          type: dto.type,
          parentId: dto.parentId,
          description: dto.description,
          active: dto.active,
        },
      });
      await this.audit.diff(performedById, 'LOCATION_UPDATE', 'Location', id, serialize(existing), serialize(l));
      return serialize(l);
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2002') {
        throw conflict('Ya existe una ubicación con ese nombre en el mismo nivel');
      }
      throw err;
    }
  }

  async remove(id: string, performedById: string): Promise<{ success: true }> {
    const existing = await this.prisma.location.findUnique({ where: { id } });
    if (!existing) throw notFound('Ubicación no encontrada');

    const children = await this.prisma.location.count({ where: { parentId: id, active: true } });
    if (children > 0) throw invalidData('No puede eliminar una ubicación con ubicaciones hijas');

    const assets = await this.prisma.asset.count({ where: { locationId: id, active: true } });
    if (assets > 0) throw invalidData('No puede eliminar una ubicación que tiene bienes');

    await this.prisma.location.update({ where: { id }, data: { active: false } });
    await this.audit.diff(performedById, 'LOCATION_DELETE', 'Location', id, serialize(existing), null);
    return { success: true };
  }

  async search(q: string): Promise<LocationDTO[]> {
    const list = await this.prisma.location.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 25,
      orderBy: { name: 'asc' },
    });
    return list.map(serialize);
  }

  private async getActiveAssetCounts(locationIds: string[]) {
    if (locationIds.length === 0) return new Map<string, number>();

    const rows = await this.prisma.asset.groupBy({
      by: ['locationId'],
      where: {
        active: true,
        deletedAt: null,
        locationId: { in: locationIds },
      },
      _count: { _all: true },
    });

    return new Map(
      rows
        .filter((row) => row.locationId)
        .map((row) => [row.locationId!, row._count._all]),
    );
  }
}
