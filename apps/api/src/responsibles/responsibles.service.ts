import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Paginated, ResponsibleWithLocationDTO } from '@inventario/types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { notFound } from '../common/exceptions/business.exception';
import { paginate } from '../common/pagination/pagination';
import { CreateResponsibleDto, UpdateResponsibleDto } from './dto/responsible.dto';

function serialize(r: any): ResponsibleWithLocationDTO {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    role: r.role,
    locationId: r.locationId,
    active: r.active,
    location: r.location ? { id: r.location.id, name: r.location.name, type: r.location.type, parentId: r.location.parentId, active: r.location.active, description: r.location.description } : null,
  };
}

@Injectable()
export class ResponsiblesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(page = 1, pageSize = 50, search?: string): Promise<Paginated<ResponsibleWithLocationDTO>> {
    const where: Prisma.ResponsibleWhereInput = {
      active: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { role: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const result = await paginate(
      this.prisma.responsible,
      { where, include: { location: true }, orderBy: { name: 'asc' } },
      page,
      pageSize,
    );
    return { items: result.items.map(serialize), meta: result.meta };
  }

  async findOne(id: string): Promise<ResponsibleWithLocationDTO> {
    const r = await this.prisma.responsible.findFirst({ where: { id, active: true }, include: { location: true } });
    if (!r) throw notFound('Responsable no encontrado');
    return serialize(r);
  }

  async create(dto: CreateResponsibleDto, performedById: string): Promise<ResponsibleWithLocationDTO> {
    const r = await this.prisma.responsible.create({
      data: {
        name: dto.name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        role: dto.role ?? null,
        locationId: dto.locationId ?? null,
      },
      include: { location: true },
    });
    await this.audit.diff(performedById, 'RESPONSIBLE_CREATE', 'Responsible', r.id, null, serialize(r));
    return serialize(r);
  }

  async update(id: string, dto: UpdateResponsibleDto, performedById: string): Promise<ResponsibleWithLocationDTO> {
    const existing = await this.prisma.responsible.findUnique({ where: { id } });
    if (!existing) throw notFound('Responsable no encontrado');

    const r = await this.prisma.responsible.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
        locationId: dto.locationId,
        active: dto.active,
      },
      include: { location: true },
    });

    await this.audit.diff(performedById, 'RESPONSIBLE_UPDATE', 'Responsible', id, serialize(existing), serialize(r));
    return serialize(r);
  }

  async remove(id: string, performedById: string): Promise<{ success: true }> {
    const existing = await this.prisma.responsible.findUnique({ where: { id } });
    if (!existing) throw notFound('Responsable no encontrado');

    await this.prisma.responsible.update({ where: { id }, data: { active: false } });
    await this.audit.diff(performedById, 'RESPONSIBLE_DELETE', 'Responsible', id, serialize(existing), null);
    return { success: true };
  }
}
