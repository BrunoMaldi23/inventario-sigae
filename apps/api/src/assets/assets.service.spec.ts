import { AssetsService } from './assets.service';
import { AuditService } from '../common/audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

const user: any = { id: 'u1', email: 'encargado@escuela.cl', name: 'Encargado Demo', roleId: 'r2', role: 'ENCARGADO_INVENTARIO', permissions: [] };

function buildTxMock() {
  const tx = {
    asset: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    location: { findFirst: jest.fn() },
    responsible: { findFirst: jest.fn() },
    assetMovement: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  return tx;
}

describe('AssetsService.transfer', () => {
  it('ejecuta traslado atomico: update + movimiento + auditoria', async () => {
    const tx = buildTxMock();
    const prisma = { withTransaction: jest.fn(async (fn) => fn(tx)) } as unknown as PrismaService;
    const audit = { diff: jest.fn(async () => undefined) } as unknown as AuditService;
    const service = new AssetsService(prisma, audit);

    const existing: any = {
      id: 'asset-1',
      assetCode: 'INV-000001',
      name: 'Notebook',
      version: 3,
      locationId: 'loc-origen',
      responsibleId: 'resp-origen',
      deletedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
      category: null,
      status: {},
      location: null,
      responsible: null,
      attachments: [],
    };

    const movement: any = {
      id: 'mov-1',
      assetId: 'asset-1',
      type: 'TRANSFER',
      createdAt: new Date('2026-01-03T00:00:00Z'),
      fromLocation: null,
      toLocation: null,
      performedBy: { id: 'u1', name: 'Encargado Demo', email: 'encargado@escuela.cl' },
    };

    tx.asset.findFirst.mockResolvedValue(existing);
    tx.location.findFirst.mockResolvedValue({ id: 'loc-destino', active: true });
    tx.responsible.findFirst.mockResolvedValue({ id: 'resp-destino', active: true });
    tx.asset.update.mockResolvedValue({ ...existing, locationId: 'loc-destino', version: 4 });
    tx.assetMovement.create.mockResolvedValue(movement);

    const result = await service.transfer(
      'asset-1',
      { toLocationId: 'loc-destino', toResponsibleId: 'resp-destino', type: 'TRANSFER', version: 3, reason: 'Reasignacion' },
      user,
    );

    expect(tx.asset.update).toHaveBeenCalledTimes(1);
    expect(tx.asset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'asset-1' },
        data: expect.objectContaining({
          locationId: 'loc-destino',
          responsibleId: 'resp-destino',
          updatedById: 'u1',
          version: { increment: 1 },
        }),
      }),
    );
    expect(tx.assetMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assetId: 'asset-1',
          type: 'TRANSFER',
          fromLocationId: 'loc-origen',
          toLocationId: 'loc-destino',
          fromResponsibleId: 'resp-origen',
          toResponsibleId: 'resp-destino',
          performedById: 'u1',
        }),
      }),
    );
    expect(audit.diff).toHaveBeenCalledWith(
      'u1',
      'ASSET_TRANSFER',
      'Asset',
      'asset-1',
      { locationId: 'loc-origen', responsibleId: 'resp-origen' },
      { locationId: 'loc-destino', responsibleId: 'resp-destino' },
      { movementType: 'TRANSFER', reason: 'Reasignacion' },
      tx,
    );
    expect(result.movement.id).toBe('mov-1');
  });

  it('rechaza traslado con version desactualizada (concurrency)', async () => {
    const tx = buildTxMock();
    const prisma = { withTransaction: jest.fn(async (fn) => fn(tx)) } as unknown as PrismaService;
    const audit = { diff: jest.fn() } as unknown as AuditService;
    const service = new AssetsService(prisma, audit);

    tx.asset.findFirst.mockResolvedValue({ version: 5, deletedAt: null } as any);

    await expect(
      service.transfer('asset-1', { toLocationId: 'loc-destino', type: 'TRANSFER', version: 4, reason: 'X' }, user),
    ).rejects.toThrow('Recargue los datos');

    expect(tx.asset.update).not.toHaveBeenCalled();
    expect(tx.assetMovement.create).not.toHaveBeenCalled();
    expect(audit.diff).not.toHaveBeenCalled();
  });

  it('rechaza traslado a ubicacion inexistente o inactiva', async () => {
    const tx = buildTxMock();
    const prisma = { withTransaction: jest.fn(async (fn) => fn(tx)) } as unknown as PrismaService;
    const audit = { diff: jest.fn() } as unknown as AuditService;
    const service = new AssetsService(prisma, audit);

    tx.asset.findFirst.mockResolvedValue({ version: 1, deletedAt: null } as any);
    tx.location.findFirst.mockResolvedValue(null);

    await expect(
      service.transfer('asset-1', { toLocationId: 'loc-no-existe', type: 'TRANSFER', version: 1, reason: 'X' }, user),
    ).rejects.toThrow('no existe o está inactiva');
  });
});