import { Injectable } from '@nestjs/common';
import { AssetStatusDTO } from '@inventario/types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { conflict, invalidData, notFound } from '../common/exceptions/business.exception';
import { CreateStatusDto, UpdateStatusDto } from './dto/status.dto';

function serialize(s: any): AssetStatusDTO {
  return { id: s.id, name: s.name, color: s.color, sortOrder: s.sortOrder, active: s.active };
}

@Injectable()
export class StatusesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(): Promise<AssetStatusDTO[]> {
    const list = await this.prisma.assetStatus.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return list.map(serialize);
  }

  async findOne(id: string): Promise<AssetStatusDTO> {
    const s = await this.prisma.assetStatus.findUnique({ where: { id } });
    if (!s) throw notFound('Estado no encontrado');
    return serialize(s);
  }

  async create(dto: CreateStatusDto, performedById: string): Promise<AssetStatusDTO> {
    try {
      const s = await this.prisma.assetStatus.create({
        data: {
          name: dto.name,
          color: dto.color ? `#${dto.color}` : '#6b7280',
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      await this.audit.diff(performedById, 'STATUS_CREATE', 'AssetStatus', s.id, null, { name: s.name, color: s.color });
      return serialize(s);
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2002') throw conflict('Ya existe un estado con ese nombre');
      throw err;
    }
  }

  async update(id: string, dto: UpdateStatusDto, performedById: string): Promise<AssetStatusDTO> {
    const existing = await this.prisma.assetStatus.findUnique({ where: { id } });
    if (!existing) throw notFound('Estado no encontrado');

    try {
      const s = await this.prisma.assetStatus.update({
        where: { id },
        data: {
          name: dto.name,
          color: dto.color ? `#${dto.color}` : undefined,
          sortOrder: dto.sortOrder,
          active: dto.active,
        },
      });
      await this.audit.diff(performedById, 'STATUS_UPDATE', 'AssetStatus', id, serialize(existing), serialize(s));
      return serialize(s);
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2002') throw conflict('Ya existe un estado con ese nombre');
      throw err;
    }
  }

  async remove(id: string, performedById: string): Promise<{ success: true }> {
    const existing = await this.prisma.assetStatus.findUnique({ where: { id } });
    if (!existing) throw notFound('Estado no encontrado');

    const inUse = await this.prisma.asset.count({ where: { statusId: id } });
    if (inUse > 0) {
      throw invalidData('No puede desactivar un estado que está en uso por bienes');
    }

    await this.prisma.assetStatus.update({ where: { id }, data: { active: false } });
    await this.audit.diff(performedById, 'STATUS_DELETE', 'AssetStatus', id, serialize(existing), null);
    return { success: true };
  }
}
