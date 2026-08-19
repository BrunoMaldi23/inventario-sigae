import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EXCEL_EXPORT_FILENAME_PREFIX } from '@inventario/config';

const HEADERS = [
  'Código del bien',
  'Denominación',
  'Descripción',
  'Marca',
  'Modelo',
  'Número de serie',
  'Categoría',
  'Estado',
  'Ubicación',
  'Responsable',
  'Valor de adquisición',
  'Proveedor',
  'Fecha de adquisición',
  'Activo',
  'Última modificación',
];

function todayFileSuffix(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async exportAssetsExcel(res: Response, where?: Prisma.AssetWhereInput, title = 'Inventario'): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Inventario Escolar';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Inventario', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    sheet.columns = HEADERS.map((h) => ({
      header: h,
      key: h,
      width: h === 'Descripción' ? 40 : 22,
    }));
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1D4ED8' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    const assets = await this.prisma.asset.findMany({
      where,
      orderBy: { assetCode: 'asc' },
      include: {
        category: true,
        status: true,
        location: { include: { parent: true } },
        responsible: true,
      },
    });

    const fl = (v: unknown) => (v === null || v === undefined ? '' : String(v));

    for (const a of assets) {
      sheet.addRow({
        'Código del bien': a.assetCode,
        Denominación: a.name,
        Descripción: fl(a.description),
        Marca: fl(a.brand),
        Modelo: fl(a.model),
        'Número de serie': fl(a.serialNumber),
        Categoría: a.category?.name ?? '',
        Estado: a.status?.name ?? '',
        Ubicación: a.location ? (a.location.parent ? `${a.location.parent.name} / ${a.location.name}` : a.location.name) : '',
        Responsable: a.responsible?.name ?? '',
        'Valor de adquisición': a.acquisitionValue ? Number(a.acquisitionValue) : '',
        Proveedor: fl(a.supplier),
        'Fecha de adquisición': a.acquisitionDate ? a.acquisitionDate.toISOString().slice(0, 10) : '',
        Activo: a.active ? 'Sí' : 'No',
        'Última modificación': a.updatedAt.toISOString(),
      });
    }

    const filename = `${EXCEL_EXPORT_FILENAME_PREFIX}_${title}_${todayFileSuffix()}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  async exportMovementsExcel(res: Response, where?: Prisma.AssetMovementWhereInput): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Inventario Escolar';
    const sheet = workbook.addWorksheet('Movimientos', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    sheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 22 },
      { header: 'Código', key: 'codigo', width: 14 },
      { header: 'Bien', key: 'bien', width: 30 },
      { header: 'Tipo', key: 'tipo', width: 20 },
      { header: 'Origen', key: 'origen', width: 24 },
      { header: 'Destino', key: 'destino', width: 24 },
      { header: 'Motivo', key: 'motivo', width: 24 },
      { header: 'Observación', key: 'obs', width: 30 },
      { header: 'Realizado por', key: 'quien', width: 24 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };

    const movements = await this.prisma.assetMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        asset: { select: { assetCode: true, name: true } },
        fromLocation: true,
        toLocation: true,
        performedBy: { select: { name: true } },
      },
    });

    const fl = (v: unknown) => (v === null || v === undefined ? '' : String(v));

    for (const m of movements) {
      sheet.addRow({
        fecha: m.createdAt.toISOString(),
        codigo: m.asset?.assetCode ?? '',
        bien: m.asset?.name ?? '',
        tipo: m.type,
        origen: m.fromLocation?.name ?? '',
        destino: m.toLocation?.name ?? '',
        motivo: m.reason,
        obs: fl(m.notes),
        quien: m.performedBy?.name ?? '',
      });
    }

    const filename = `${EXCEL_EXPORT_FILENAME_PREFIX}_Movimientos_${todayFileSuffix()}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  async exportTemplate(res: Response): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Plantilla');
    sheet.columns = [
      { header: 'N°', key: 'n', width: 8 },
      { header: 'Código del bien', key: 'codigo', width: 18 },
      { header: 'Denominación', key: 'denominacion', width: 30 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Marca', key: 'marca', width: 16 },
      { header: 'Modelo', key: 'modelo', width: 16 },
      { header: 'Número de serie', key: 'serie', width: 22 },
      { header: 'Estado', key: 'estado', width: 18 },
      { header: 'Categoría', key: 'categoria', width: 18 },
      { header: 'Ubicación', key: 'ubicacion', width: 22 },
    ];
    sheet.getRow(1).font = { bold: true };

    const statuses = await this.prisma.assetStatus.findMany({ where: { active: true } });
    const row2 = sheet.addRow([1, 'INV-000001', 'Silla escolar', 'Silla azul', 'Marca X', 'Modelo Y', 'SN-0001', 'Bueno', 'Mobiliario', '3° B']);
    row2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };

    if (statuses.length) {
      const noteRow = sheet.addRow([null, null, null, null, null, null, null, statuses.map((s) => s.name).join(', '), null, null]);
      noteRow.font = { italic: true, color: { argb: 'FF6B7280' } };
    }

    const filename = `Plantilla_Importacion_Inventario.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  }
}