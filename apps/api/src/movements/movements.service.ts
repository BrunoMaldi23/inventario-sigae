import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AssetMovementDTO, Paginated } from '@inventario/types';
import { PrismaService } from '../prisma/prisma.service';
import { notFound } from '../common/exceptions/business.exception';
import { paginate } from '../common/pagination/pagination';
import { serializeMovement } from '../assets/assets.service';
import { QueryMovementsDto } from './dto/movement.dto';

@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryMovementsDto): Promise<Paginated<AssetMovementDTO>> {
    const where: Prisma.AssetMovementWhereInput = {};

    if (query.type) where.type = query.type as any;
    if (query.assetId) where.assetId = query.assetId;
    if (query.locationId) {
      where.OR = [{ fromLocationId: query.locationId }, { toLocationId: query.locationId }];
    }
    if (query.search) {
      const q = query.search.trim();
      const ids = await this.prisma.asset.findMany({
        where: {
          OR: [
            { assetCode: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
        take: 200,
      });
      where.assetId = { in: ids.map((a) => a.id) };
    }
    const dateFilter: Prisma.DateTimeFilter = {};
    if (query.from) dateFilter.gte = new Date(query.from);
    if (query.to) dateFilter.lte = new Date(query.to);
    if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;

    const result = await paginate(
      this.prisma.assetMovement,
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: { select: { id: true, assetCode: true, name: true } },
          fromLocation: { include: { parent: true } },
          toLocation: { include: { parent: true } },
          performedBy: { select: { id: true, name: true, email: true } },
        },
      },
      query.page,
      query.pageSize,
    );

    const items = (result.items as any[]).map((m) => ({
      ...serializeMovement(m),
      assetSnapshot: m.asset ? { id: m.asset.id, assetCode: m.asset.assetCode, name: m.asset.name } : null,
    }));

    return { items, meta: result.meta };
  }

  async findOne(id: string): Promise<AssetMovementDTO> {
    const m = await this.prisma.assetMovement.findUnique({
      where: { id },
      include: {
        asset: true,
        fromLocation: true,
        toLocation: true,
        performedBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!m) throw notFound('Movimiento no encontrado');
    return serializeMovement(m);
  }
}
