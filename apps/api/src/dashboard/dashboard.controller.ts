import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

const GOOD_STATUS = 'Bueno';
const REGULAR_STATUS = 'Regular';
const BAD_STATUS = 'Malo';
const REPAIR_STATUS = 'En reparación';
const DISPOSED_STATUS = 'De baja';
const LOST_STATUS = 'Extraviado';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  @ApiOperation({ summary: 'KPIs y distribuciones del inventario' })
  async summary() {
    const total = await this.prisma.asset.count({ where: { active: true, deletedAt: null } });

    const statuses = await this.prisma.assetStatus.findMany({
      where: { active: true },
      include: { _count: { select: { assets: { where: { active: true, deletedAt: null } } } } },
    });

    const byStatus = statuses.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      count: s._count.assets,
    }));

    const pick = (name: string) => byStatus.find((s) => s.name === name)?.count ?? 0;

    const recentMovements = await this.prisma.assetMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        asset: { select: { id: true, assetCode: true, name: true } },
        fromLocation: true,
        toLocation: true,
        performedBy: { select: { id: true, name: true } },
      },
    });

    // Distribución por categoría (agregada desde los bienes)
    const byCategory = await this.prisma.asset.groupBy({
      by: ['categoryId'],
      where: { active: true, deletedAt: null, categoryId: { not: null } },
      _count: { _all: true },
    });
    const catIds = byCategory.map((r) => r.categoryId as string);
    const cats = await this.prisma.assetCategory.findMany({
      where: { id: { in: catIds } },
      select: { id: true, name: true },
    });
    const catNames = new Map(cats.map((c) => [c.id, c.name]));

    // Distribución por ubicación
    const byLocation = await this.prisma.asset.groupBy({
      by: ['locationId'],
      where: { active: true, deletedAt: null, locationId: { not: null } },
      _count: { _all: true },
    });
    const locs = await this.prisma.location.findMany({
      where: { active: true },
      select: { id: true, name: true },
    });
    const locNames = new Map(locs.map((l) => [l.id, l.name]));

    const locationDist = byLocation
      .map((r) => ({
        locationId: r.locationId as string,
        name: r.locationId ? locNames.get(r.locationId) ?? 'Desconocida' : null,
        count: r._count._all,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const withoutLocation = await this.prisma.asset.count({
      where: { active: true, deletedAt: null, locationId: null },
    });
    const withoutResponsible = await this.prisma.asset.count({
      where: { active: true, deletedAt: null, responsibleId: null },
    });
    const withoutSerial = await this.prisma.asset.count({
      where: { active: true, deletedAt: null, serialNumber: null },
    });

    return {
      kpis: {
        total,
        activos: total,
        buenEstado: pick(GOOD_STATUS),
        regular: pick(REGULAR_STATUS),
        malo: pick(BAD_STATUS),
        enReparacion: pick(REPAIR_STATUS),
        deBaja: pick(DISPOSED_STATUS),
        extraviados: pick(LOST_STATUS),
      },
      alerts: {
        sinUbicacion: withoutLocation,
        sinResponsable: withoutResponsible,
        sinSerie: withoutSerial,
      },
      byStatus,
      byCategory: byCategory
        .map((r) => ({
          name: r.categoryId ? catNames.get(r.categoryId) ?? 'Sin categoría' : 'Sin categoría',
          count: r._count._all,
        }))
        .sort((a, b) => b.count - a.count),
      byLocation: locationDist,
      recentMovements: recentMovements.map((m) => ({
        id: m.id,
        assetCode: m.asset?.assetCode ?? null,
        assetName: m.asset?.name ?? null,
        type: m.type,
        fromLocation: m.fromLocation?.name ?? null,
        toLocation: m.toLocation?.name ?? null,
        performedBy: m.performedBy?.name ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }
}