import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  AssetDTO,
  AssetListItemDTO,
  AssetMovementDTO,
  AssetMovementType,
  AuthUser,
  Paginated,
} from '@inventario/types';
import { ASSET_CODE_PAD, ASSET_CODE_PREFIX } from '@inventario/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { locationPath } from '../locations/locations.service';
import {
  conflict,
  notFound,
  invalidData,
} from '../common/exceptions/business.exception';
import { paginate } from '../common/pagination/pagination';
import {
  BulkStatusDto,
  BulkTransferDto,
  ChangeStatusDto,
  CreateAssetDto,
  QueryAssetsDto,
  TransferAssetDto,
  UpdateAssetDto,
} from './dto/asset.dto';

const assetInclude = {
  category: true,
  status: true,
  location: { include: { parent: true } },
  responsible: true,
  attachments: true,
} satisfies Prisma.AssetInclude;

type AssetWithRelations = Prisma.AssetGetPayload<{ include: typeof assetInclude }>;

export function serializeAsset(a: AssetWithRelations): AssetDTO {
  return {
    id: a.id,
    assetCode: a.assetCode,
    name: a.name,
    description: a.description,
    brand: a.brand,
    model: a.model,
    serialNumber: a.serialNumber,
    qrCode: a.qrCode,
    barcode: a.barcode,
    categoryId: a.categoryId,
    statusId: a.statusId,
    locationId: a.locationId,
    responsibleId: a.responsibleId,
    acquisitionDate: a.acquisitionDate ? a.acquisitionDate.toISOString() : null,
    acquisitionValue: a.acquisitionValue ? Number(a.acquisitionValue) : null,
    supplier: a.supplier,
    invoiceNumber: a.invoiceNumber,
    purchaseOrder: a.purchaseOrder,
    fundingSource: a.fundingSource,
    provenance: a.provenance,
    notes: a.notes,
    active: a.active,
    version: a.version,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    deletedAt: a.deletedAt ? a.deletedAt.toISOString() : null,
    category: a.category
      ? { id: a.category.id, name: a.category.name, parentId: a.category.parentId, active: a.category.active, description: a.category.description }
      : null,
    status: a.status
      ? { id: a.status.id, name: a.status.name, color: a.status.color, sortOrder: a.status.sortOrder, active: a.status.active }
      : null,
    location: a.location
      ? {
          id: a.location.id,
          name: a.location.name,
          type: a.location.type,
          parentId: a.location.parentId,
          active: a.location.active,
          description: a.location.description,
          path: locationPath(a.location),
        }
      : null,
    responsible: a.responsible
      ? {
          id: a.responsible.id,
          name: a.responsible.name,
          email: a.responsible.email,
          phone: a.responsible.phone,
          role: a.responsible.role,
          locationId: a.responsible.locationId,
          active: a.responsible.active,
        }
      : null,
  };
}

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /* ------------------------------------------------------------------ */
  /* Consultas                                                           */
  /* ------------------------------------------------------------------ */

  async findAll(query: QueryAssetsDto): Promise<Paginated<AssetListItemDTO>> {
    const where: Prisma.AssetWhereInput = { deletedAt: null };

    if (query.active === false) where.active = false;
    else if (query.active !== undefined) where.active = true;
    else where.active = true;

    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { assetCode: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { serialNumber: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.statusId) where.statusId = query.statusId;
    if (query.locationId) where.locationId = query.locationId;
    if (query.responsibleId) where.responsibleId = query.responsibleId;
    if (query.brand) where.brand = { equals: query.brand, mode: 'insensitive' };
    if (query.hasSerial === true) where.serialNumber = { not: null };
    if (query.hasSerial === false) where.serialNumber = null;
    if (query.hasPhoto === true) where.attachments = { some: { type: 'PHOTO' } };
    if (query.hasPhoto === false) where.attachments = { none: { type: 'PHOTO' } };
const updatedAtFilter: Prisma.DateTimeFilter = {};
    if (query.updatedFrom) updatedAtFilter.gte = new Date(query.updatedFrom);
    if (query.updatedTo) updatedAtFilter.lte = new Date(query.updatedTo);
    if (Object.keys(updatedAtFilter).length > 0) where.updatedAt = updatedAtFilter;

    const sortCol = query.orderBy ?? 'assetCode';
    const sortDir = query.order === 'desc' ? 'desc' : 'asc';
    const orderBy: Prisma.AssetOrderByWithRelationInput = { [sortCol]: sortDir };

    const result = await paginate(
      this.prisma.asset,
      { where, include: assetInclude, orderBy },
      query.page,
      query.pageSize,
    );

    // Ãšltimo movimiento por bien (evita N+1)
    const ids = result.items.map((a: any) => a.id);
    const lastMovements = ids.length
      ? await this.prisma.assetMovement.findMany({
          where: { assetId: { in: ids } },
          orderBy: { createdAt: 'desc' },
          include: { toLocation: true, fromLocation: true },
        })
      : [];

    const lastByAsset = new Map<string, { type: string; createdAt: Date; toLocationName: string | null; fromLocationName: string | null }>();
    for (const m of lastMovements) {
      if (!lastByAsset.has(m.assetId)) {
        lastByAsset.set(m.assetId, {
          type: m.type,
          createdAt: m.createdAt,
          toLocationName: m.toLocation?.name ?? null,
          fromLocationName: m.fromLocation?.name ?? null,
        });
      }
    }

const items = result.items.map((a: any) => ({
      ...serializeAsset(a),
      lastMovement: lastByAsset.has(a.id)
        ? {
            type: lastByAsset.get(a.id)!.type as AssetMovementType,
            createdAt: lastByAsset.get(a.id)!.createdAt.toISOString(),
            toLocationName: lastByAsset.get(a.id)!.toLocationName,
            fromLocationName: lastByAsset.get(a.id)!.fromLocationName,
          }
        : null,
    }));

    return { items, meta: result.meta };
  }

  async findOne(id: string): Promise<AssetDTO> {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
      include: assetInclude,
    });
    if (!asset) throw notFound('El bien no existe');
    return serializeAsset(asset);
  }

  async findByCodeOrId(ref: string): Promise<AssetDTO> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref.trim());
    const asset = await this.prisma.asset.findFirst({
      where: isUuid
        ? { id: ref.trim(), deletedAt: null }
        : { assetCode: ref.trim().toUpperCase(), deletedAt: null },
      include: assetInclude,
    });
    if (!asset) throw notFound('El bien no existe');
    return serializeAsset(asset);
  }

  async findByCode(code: string): Promise<AssetDTO> {
    const asset = await this.prisma.asset.findFirst({
      where: { assetCode: code.toUpperCase().trim(), deletedAt: null },
      include: assetInclude,
    });
    if (!asset) throw notFound('El bien no existe');
    return serializeAsset(asset);
  }

  async findByQr(qrValue: string): Promise<AssetDTO> {
    const raw = qrValue.trim();
    // Compatible con inventario://asset/<uuid> o https://host/assets/<uuid>
    const segment = raw.split('/').pop() ?? raw;
    const asset = await this.prisma.asset.findFirst({
      where: { deletedAt: null, OR: [{ id: segment }, { qrCode: raw }, { assetCode: segment.toUpperCase() }, { barcode: raw }] },
      include: assetInclude,
    });
    if (!asset) throw notFound('No se encontró ningún bien para el código escaneado');
    return serializeAsset(asset);
  }

  /* ------------------------------------------------------------------ */
  /* Creación y actualización                                            */
  /* ------------------------------------------------------------------ */

  async create(dto: CreateAssetDto, user: AuthUser): Promise<AssetDTO> {
    let assetCode = dto.assetCode?.trim().toUpperCase();
    if (assetCode) {
      const dup = await this.prisma.asset.findUnique({ where: { assetCode } });
      if (dup) throw conflict(`El código ${assetCode} ya está en uso`);
    } else {
      assetCode = await this.generateNextAssetCode();
    }

    return this.prisma.withTransaction(async (tx) => {
      if (dto.statusId) await this.ensureExists(tx, 'assetStatus', dto.statusId, 'Estado');
      if (dto.categoryId) await this.ensureExists(tx, 'assetCategory', dto.categoryId, 'Categoría');
      if (dto.locationId) await this.ensureExists(tx, 'location', dto.locationId, 'Ubicación');
      if (dto.responsibleId) await this.ensureExists(tx, 'responsible', dto.responsibleId, 'Responsable');

      const asset = await tx.asset.create({
        data: {
          assetCode,
          name: dto.name,
          description: dto.description ?? null,
          brand: dto.brand ?? null,
          model: dto.model ?? null,
          serialNumber: dto.serialNumber ?? null,
          barcode: dto.barcode ?? null,
          categoryId: dto.categoryId ?? null,
          statusId: dto.statusId,
          locationId: dto.locationId ?? null,
          responsibleId: dto.responsibleId ?? null,
          acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : null,
          acquisitionValue: dto.acquisitionValue !== undefined ? dto.acquisitionValue : undefined,
          supplier: dto.supplier ?? null,
          invoiceNumber: dto.invoiceNumber ?? null,
          purchaseOrder: dto.purchaseOrder ?? null,
          fundingSource: dto.fundingSource ?? null,
          provenance: dto.provenance ?? null,
          notes: dto.notes ?? null,
          active: dto.active ?? true,
          createdById: user.id,
          updatedById: user.id,
        },
        include: assetInclude,
      });

      if (!asset.qrCode) {
        await tx.asset.update({
          where: { id: asset.id },
          data: { qrCode: `inventario://asset/${asset.id}` },
        });
        asset.qrCode = `inventario://asset/${asset.id}`;
      }

      await this.audit.diff(user.id, 'ASSET_CREATE', 'Asset', asset.id, null, serializeAsset(asset as unknown as AssetWithRelations), undefined, tx);

      return serializeAsset(asset as unknown as AssetWithRelations);
    });
  }

  async update(id: string, dto: UpdateAssetDto, user: AuthUser): Promise<AssetDTO> {
    return this.prisma.withTransaction(async (tx) => {
      const existing = await tx.asset.findFirst({ where: { id, deletedAt: null }, include: assetInclude });
      if (!existing) throw notFound('El bien no existe');

      if (dto.version !== undefined && dto.version !== existing.version) {
        throw conflict('El bien fue modificado por otro usuario. Recargue los datos e intente nuevamente.');
      }

      if (dto.assetCode && dto.assetCode.toUpperCase() !== existing.assetCode) {
        const code = dto.assetCode.toUpperCase();
        const dup = await tx.asset.findUnique({ where: { assetCode: code } });
        if (dup) throw conflict(`El código ${code} ya está en uso`);
        dto.assetCode = code;
      }

const data: Prisma.AssetUncheckedUpdateInput = {
        name: dto.name,
        description: dto.description,
        brand: dto.brand,
        model: dto.model,
        serialNumber: dto.serialNumber,
        barcode: dto.barcode,
        assetCode: dto.assetCode,
        categoryId: dto.categoryId === undefined ? undefined : dto.categoryId,
        statusId: dto.statusId,
        locationId: dto.locationId === undefined ? undefined : dto.locationId,
        responsibleId: dto.responsibleId === undefined ? undefined : dto.responsibleId,
        acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : dto.acquisitionDate === null ? null : undefined,
        acquisitionValue: dto.acquisitionValue !== undefined ? dto.acquisitionValue : undefined,
        supplier: dto.supplier,
        invoiceNumber: dto.invoiceNumber,
        purchaseOrder: dto.purchaseOrder,
        fundingSource: dto.fundingSource,
        provenance: dto.provenance,
        notes: dto.notes,
        active: dto.active,
        updatedById: user.id,
        version: { increment: 1 },
      };

      const asset = await tx.asset.update({ where: { id }, data, include: assetInclude });

      await this.audit.diff(
        user.id,
        'ASSET_UPDATE',
        'Asset',
        id,
        serializeAsset(existing),
        serializeAsset(asset),
        undefined,
        tx,
      );

      return serializeAsset(asset);
    });
  }

  async remove(id: string, user: AuthUser): Promise<{ success: true }> {
    const existing = await this.prisma.asset.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound('El bien no existe');

    await this.prisma.asset.update({
      where: { id },
      data: { active: false, deletedAt: new Date(), updatedById: user.id },
    });

    await this.audit.diff(user.id, 'ASSET_DELETE', 'Asset', id, { active: true }, { active: false });
    return { success: true };
  }

  /* ------------------------------------------------------------------ */
  /* Traslado: operación crítica atómica                                  */
  /* ------------------------------------------------------------------ */

  async transfer(id: string, dto: TransferAssetDto, user: AuthUser): Promise<{ asset: AssetDTO; movement: AssetMovementDTO }> {
    const result = await this.prisma.withTransaction(async (tx) => {
      const existing = await tx.asset.findFirst({ where: { id, deletedAt: null }, include: assetInclude });
      if (!existing) throw notFound('El bien no existe');

      if (dto.version !== undefined && dto.version !== existing.version) {
        throw conflict('El bien fue modificado por otro usuario. Recargue los datos e intente nuevamente.');
      }

      const toLocation = await tx.location.findFirst({ where: { id: dto.toLocationId, active: true } });
      if (!toLocation) throw invalidData('La ubicación de destino no existe o está inactiva');

      let toResponsibleId = dto.toResponsibleId ?? null;
      if (toResponsibleId) {
        const resp = await tx.responsible.findFirst({ where: { id: toResponsibleId, active: true } });
        if (!resp) throw invalidData('El responsable de destino no existe o está inactivo');
      }

      const wasAt = existing.locationId;
      const type = dto.type ?? 'TRANSFER';
      const reason = dto.reason ?? 'Reubicación';

      // 1. Actualizar ubicación actual + responsabilidad + versión
      const updated = await tx.asset.update({
        where: { id },
        data: {
          locationId: dto.toLocationId,
          responsibleId: toResponsibleId,
          updatedById: user.id,
          version: { increment: 1 },
        },
        include: assetInclude,
      });

      // 2. Registrar movimiento histórico (inmutable)
      const movement = await tx.assetMovement.create({
        data: {
          assetId: id,
          type,
          fromLocationId: wasAt,
          toLocationId: dto.toLocationId,
          fromResponsibleId: existing.responsibleId,
          toResponsibleId,
          reason,
          notes: dto.notes ?? null,
          performedById: user.id,
        },
        include: {
          fromLocation: { include: { parent: true } },
          toLocation: { include: { parent: true } },
          performedBy: { select: { id: true, name: true, email: true } },
        },
      });

      // 3. Auditoría
      await this.audit.diff(
        user.id,
        'ASSET_TRANSFER',
        'Asset',
        id,
        { locationId: wasAt, responsibleId: existing.responsibleId },
        { locationId: dto.toLocationId, responsibleId: toResponsibleId },
        { movementType: type, reason },
        tx,
      );

      return { asset: updated, movement };
    });

    return {
      asset: serializeAsset(result.asset as unknown as AssetWithRelations),
      movement: serializeMovement(result.movement),
    };
  }

  /* Cambio de estado: transacción atómica con historial + auditoría */
  async changeStatus(id: string, dto: ChangeStatusDto, user: AuthUser): Promise<{ asset: AssetDTO; movement: AssetMovementDTO }> {
    const result = await this.prisma.withTransaction(async (tx) => {
      const existing = await tx.asset.findFirst({ where: { id, deletedAt: null }, include: assetInclude });
      if (!existing) throw notFound('El bien no existe');

      if (dto.version !== undefined && dto.version !== existing.version) {
        throw conflict('El bien fue modificado por otro usuario. Recargue los datos e intente nuevamente.');
      }

      const toStatus = await tx.assetStatus.findFirst({ where: { id: dto.toStatusId, active: true } });
      if (!toStatus) throw invalidData('El estado de destino no existe o está inactivo');

      let toLocationId = existing.locationId;
      if (dto.toLocationId) {
        const toLocation = await tx.location.findFirst({ where: { id: dto.toLocationId, active: true } });
        if (!toLocation) throw invalidData('La ubicación de destino no existe o está inactiva');
        toLocationId = dto.toLocationId;
      }

      const updated = await tx.asset.update({
        where: { id },
        data: {
          statusId: dto.toStatusId,
          locationId: toLocationId,
          updatedById: user.id,
          version: { increment: 1 },
        },
        include: assetInclude,
      });

      const movement = await tx.assetMovement.create({
        data: {
          assetId: id,
          type: 'STATUS_CHANGE',
          fromStatusId: existing.statusId,
          toStatusId: dto.toStatusId,
          fromLocationId: existing.locationId,
          toLocationId,
          reason: dto.reason,
          notes: dto.notes ?? null,
          performedById: user.id,
        },
        include: {
          fromStatus: true,
          toStatus: true,
          performedBy: { select: { id: true, name: true, email: true } },
        },
      });

      await this.audit.diff(
        user.id,
        'ASSET_STATUS_CHANGE',
        'Asset',
        id,
        { statusId: existing.statusId, locationId: existing.locationId },
        { statusId: dto.toStatusId, locationId: toLocationId },
        { reason: dto.reason },
        tx,
      );

      return { asset: updated, movement };
    });

    return {
      asset: serializeAsset(result.asset as unknown as AssetWithRelations),
      movement: serializeMovement(result.movement as unknown as any),
    };
  }

  /* Acciones masivas (traslado lote) */
  async bulkTransfer(dto: BulkTransferDto, user: AuthUser) {
    const toLocation = await this.prisma.location.findFirst({ where: { id: dto.toLocationId, active: true } });
    if (!toLocation) throw invalidData('La ubicación de destino no existe o está inactiva');

    const assets = await this.prisma.asset.findMany({
      where: { id: { in: dto.assetIds }, deletedAt: null },
      select: { id: true, locationId: true, responsibleId: true },
    });
    if (assets.length !== dto.assetIds.length) {
      throw invalidData('Algunos bienes no existen');
    }

    const done = await this.prisma.withTransaction(async (tx) => {
      let count = 0;
      for (const a of assets) {
        await tx.asset.update({
          where: { id: a.id },
          data: { locationId: dto.toLocationId, updatedById: user.id, version: { increment: 1 } },
        });
        await tx.assetMovement.create({
          data: {
            assetId: a.id,
            type: 'TRANSFER',
            fromLocationId: a.locationId,
            toLocationId: dto.toLocationId,
            fromResponsibleId: a.responsibleId,
            reason: dto.reason,
            notes: dto.notes ?? null,
            performedById: user.id,
          },
        });
        await this.audit.write(
          {
            userId: user.id,
            action: 'ASSET_TRANSFER',
            entityType: 'Asset',
            entityId: a.id,
            oldValues: { locationId: a.locationId },
            newValues: { locationId: dto.toLocationId },
            metadata: { bulk: true, reason: dto.reason },
          },
          tx,
        );
        count++;
      }
      return count;
    });

    return { processed: done };
  }

  async bulkStatus(dto: BulkStatusDto, user: AuthUser) {
    const toStatus = await this.prisma.assetStatus.findFirst({ where: { id: dto.toStatusId, active: true } });
    if (!toStatus) throw invalidData('El estado de destino no existe o está inactivo');

    const assets = await this.prisma.asset.findMany({
      where: { id: { in: dto.assetIds }, deletedAt: null },
      select: { id: true, statusId: true },
    });
    if (assets.length !== dto.assetIds.length) {
      throw invalidData('Algunos bienes no existen');
    }

    const done = await this.prisma.withTransaction(async (tx) => {
      let count = 0;
      for (const a of assets) {
        await tx.asset.update({
          where: { id: a.id },
          data: { statusId: dto.toStatusId, updatedById: user.id, version: { increment: 1 } },
        });
        await tx.assetMovement.create({
          data: {
            assetId: a.id,
            type: 'STATUS_CHANGE',
            fromStatusId: a.statusId,
            toStatusId: dto.toStatusId,
            reason: dto.reason,
            notes: dto.notes ?? null,
            performedById: user.id,
          },
        });
        await this.audit.write(
          {
            userId: user.id,
            action: 'ASSET_STATUS_CHANGE',
            entityType: 'Asset',
            entityId: a.id,
            oldValues: { statusId: a.statusId },
            newValues: { statusId: dto.toStatusId },
            metadata: { bulk: true, reason: dto.reason },
          },
          tx,
        );
        count++;
      }
      return count;
    });

    return { processed: done };
  }

  /* ------------------------------------------------------------------ */
  /* Historial                                                           */
  /* ------------------------------------------------------------------ */

  async history(id: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id, deletedAt: null }, include: assetInclude });
    if (!asset) throw notFound('El bien no existe');

    const movements = await this.prisma.assetMovement.findMany({
      where: { assetId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        fromLocation: { include: { parent: true } },
        toLocation: { include: { parent: true } },
        fromStatus: true,
        toStatus: true,
        fromResponsible: true,
        toResponsible: true,
        performedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return { asset: serializeAsset(asset), movements: movements.map(serializeMovement) };
  }

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */

  async generateNextAssetCode(tx?: PrismaClient | Prisma.TransactionClient): Promise<string> {
    const client = tx ?? this.prisma;
    const rows = await client.$queryRaw<Array<{ max: bigint | number | null }>>`
      SELECT MAX(CAST(SUBSTRING("assetCode", ${ASSET_CODE_PREFIX.length + 2}) AS INTEGER)) AS max
      FROM "Asset"
      WHERE "assetCode" LIKE ${`${ASSET_CODE_PREFIX}-%`}
    `;
    const last = rows[0]?.max;
    const next = last === null || last === undefined ? 1 : Number(last) + 1;
    return `${ASSET_CODE_PREFIX}-${String(next).padStart(ASSET_CODE_PAD, '0')}`;
  }

  private async ensureExists(
    tx: Prisma.TransactionClient,
    model: 'assetStatus' | 'assetCategory' | 'location' | 'responsible',
    id: string,
    label: string,
  ): Promise<void> {
    const found = await (tx[model] as any).findUnique({ where: { id } });
    if (!found) throw invalidData(`${label} no existe`);
  }
}

export function serializeMovement(m: any): AssetMovementDTO {
  return {
    id: m.id,
    assetId: m.assetId,
    type: m.type,
    fromLocationId: m.fromLocationId,
    toLocationId: m.toLocationId,
    fromResponsibleId: m.fromResponsibleId,
    toResponsibleId: m.toResponsibleId,
    fromStatusId: m.fromStatusId,
    toStatusId: m.toStatusId,
    reason: m.reason,
    notes: m.notes,
    performedById: m.performedById,
    createdAt: m.createdAt.toISOString(),
    fromLocation: m.fromLocation
      ? { id: m.fromLocation.id, name: m.fromLocation.name, type: m.fromLocation.type, parentId: m.fromLocation.parentId, active: m.fromLocation.active, description: m.fromLocation.description, path: locationPath(m.fromLocation) }
      : null,
    toLocation: m.toLocation
      ? { id: m.toLocation.id, name: m.toLocation.name, type: m.toLocation.type, parentId: m.toLocation.parentId, active: m.toLocation.active, description: m.toLocation.description, path: locationPath(m.toLocation) }
      : null,
    toStatus: m.toStatus ? { id: m.toStatus.id, name: m.toStatus.name, color: m.toStatus.color, sortOrder: m.toStatus.sortOrder, active: m.toStatus.active } : null,
    fromStatus: m.fromStatus ? { id: m.fromStatus.id, name: m.fromStatus.name, color: m.fromStatus.color, sortOrder: m.fromStatus.sortOrder, active: m.fromStatus.active } : null,
    performedBy: m.performedBy ? { id: m.performedBy.id, email: m.performedBy.email, name: m.performedBy.name, roleId: '', active: true, createdAt: '', updatedAt: '' } : null,
  };
}
