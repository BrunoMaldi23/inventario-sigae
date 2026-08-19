import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CategoryDTO } from '@inventario/types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { conflict, invalidData, notFound } from '../common/exceptions/business.exception';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

function serialize(c: any): CategoryDTO {
  return {
    id: c.id,
    name: c.name,
    parentId: c.parentId,
    active: c.active,
    description: c.description,
  };
}

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(): Promise<CategoryDTO[]> {
    const cats = await this.prisma.assetCategory.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: { children: true },
    });
    // Construir árbol solo de raíces (las hijas aparecen dentro de children)
    const roots = cats.filter((c) => !c.parentId);
    const map = new Map(cats.map((c) => [c.id, serialize(c)]));
    for (const c of cats) {
      if (c.parentId && map.has(c.parentId)) {
        const parent = map.get(c.parentId)!;
        parent.children = [...(parent.children ?? []), map.get(c.id)!];
      }
    }
    return roots.map((c) => map.get(c.id)!);
  }

  async findOne(id: string): Promise<CategoryDTO> {
    const c = await this.prisma.assetCategory.findFirst({
      where: { id, active: true },
      include: { parent: true },
    });
    if (!c) throw notFound('Categoría no encontrada');
    return serialize(c);
  }

  async create(dto: CreateCategoryDto, performedById: string): Promise<CategoryDTO> {
    if (dto.parentId) {
      const parent = await this.prisma.assetCategory.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw notFound('Categoría padre no encontrada');
    }

    try {
      const c = await this.prisma.assetCategory.create({
        data: { name: dto.name, description: dto.description, parentId: dto.parentId ?? null },
      });
      await this.audit.diff(performedById, 'CATEGORY_CREATE', 'AssetCategory', c.id, null, { name: c.name, parentId: c.parentId });
      return serialize(c);
    } catch (err) {
      if (this.isUnique(err)) throw conflict('Ya existe una categoría con ese nombre en el mismo nivel');
      throw err;
    }
  }

  async update(id: string, dto: UpdateCategoryDto, performedById: string): Promise<CategoryDTO> {
    const existing = await this.prisma.assetCategory.findUnique({ where: { id } });
    if (!existing) throw notFound('Categoría no encontrada');

    if (dto.parentId) {
      if (dto.parentId === id) throw invalidData('Una categoría no puede ser su propio padre');
      const parent = await this.prisma.assetCategory.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw notFound('Categoría padre no encontrada');
    }

    try {
      const c = await this.prisma.assetCategory.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          parentId: dto.parentId,
          active: dto.active,
        },
        include: { parent: true, children: true },
      });
      await this.audit.diff(performedById, 'CATEGORY_UPDATE', 'AssetCategory', id, serialize(existing), serialize(c));
      return serialize(c);
    } catch (err) {
      if (this.isUnique(err)) throw conflict('Ya existe una categoría con ese nombre en el mismo nivel');
      throw err;
    }
  }

  async remove(id: string, performedById: string): Promise<{ success: true }> {
    const existing = await this.prisma.assetCategory.findUnique({ where: { id } });
    if (!existing) throw notFound('Categoría no encontrada');

    const children = await this.prisma.assetCategory.count({ where: { parentId: id } });
    if (children > 0) {
      throw invalidData('No puede eliminar una categoría que tiene subcategorías');
    }
    const assets = await this.prisma.asset.count({ where: { categoryId: id } });
    if (assets > 0) {
      throw invalidData('No puede eliminar una categoría que está en uso por bienes');
    }

    await this.prisma.assetCategory.update({ where: { id }, data: { active: false } });
    await this.audit.diff(performedById, 'CATEGORY_DELETE', 'AssetCategory', id, serialize(existing), null);
    return { success: true };
  }

  private isUnique(err: unknown): boolean {
    return (
      err instanceof Prisma.PrismaClientKnownRequestError ||
      (err as { code?: string })?.code === 'P2002'
    );
  }
}
