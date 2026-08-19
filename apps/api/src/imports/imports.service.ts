import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { ASSET_CODE_PREFIX } from '@inventario/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { invalidData, notFound } from '../common/exceptions/business.exception';
import { AssetsService } from '../assets/assets.service';

export interface ImportIssue {
  code: string;
  message: string;
  level: 'error' | 'warning';
}

export interface ParsedImportRow {
  row: number;
  assetCode?: string;
  name?: string;
  description?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  statusId?: string;
  statusName?: string;
  categoryId?: string;
  locationId?: string;
  issues: ImportIssue[];
}

interface StoredImport {
  id: string;
  userId: string;
  records: ParsedImportRow[];
}

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const SYNONYMS: Record<string, string[]> = {
  assetCode: ['codigo', 'codigo del bien', 'codigo bien', 'code', 'n', 'numero', 'no', 'id'],
  name: ['denominacion', 'nombre', 'nombre del bien', 'nombre bien', 'bien'],
  description: ['descripcion', 'description', 'detalle'],
  brand: ['marca', 'marca comercial', 'marca del bien'],
  model: ['modelo', 'modelo del bien'],
  serialNumber: ['numero de serie', 'numero serie', 'n de serie', 'no de serie', 'serie', 'n serial', 'serial'],
  status: ['estado', 'estado del bien', 'estado fisico', 'condicion'],
  category: ['categoria', 'tipo', 'clasificacion', 'rubro'],
  location: ['ubicacion', 'ubicacion actual', 'lugar', 'sala', 'curso', 'dependencia', 'sector'],
  responsible: ['responsable', 'encargado', 'profesor', 'persona a cargo'],
};

const IGNORED_HEADERS = ['n', 'numero', 'no', 'id'];

function classifyHeader(header: string): string | null {
  const h = normalizeHeader(header);
  if (IGNORED_HEADERS.includes(h)) return null;
  for (const [key, syns] of Object.entries(SYNONYMS)) {
    if (syns.some((s) => h === s || h.includes(s + ' ') || h.startsWith(s + ' (') || h.endsWith(' ' + s))) {
      return key;
    }
  }
  return null;
}

export interface PreviewIssue extends ImportIssue {}

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);
  private readonly tmpDir = join(process.cwd(), 'storage', 'tmp');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly assetsService: AssetsService,
  ) {
    if (!existsSync(this.tmpDir)) {
      mkdirSync(this.tmpDir, { recursive: true });
    }
  }

  /** Parseo y preview. Crea un ImportJob en estado VALIDATED. */
  async processUpload(buffer: Buffer, filename: string, userId: string) {
    this.logger.log(`Importación iniciada: ${filename}`);

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    } catch {
      throw invalidData('El archivo no es un Excel válido (.xlsx)');
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) throw invalidData('El archivo no tiene hojas de cálculo');

    const rows = sheet.getRows(2, sheet.rowCount - 1) ?? [];
    const headerCells = [];
    for (let col = 1; col <= (sheet.getRow(1).cellCount || 20); col++) {
      const cell = sheet.getRow(1).getCell(col);
      headerCells.push(cell.value ? String(cell.text) : '');
    }

    const colMap = new Map<string, number>();
    headerCells.forEach((text, idx) => {
      if (!text.trim()) return;
      const key = classifyHeader(text);
      if (key) colMap.set(key, idx + 1);
    });

    if (!colMap.has('name')) {
      throw invalidData('La plantilla no incluye columna de Denominación/Nombre');
    }

    const [statuses, categories, locations] = await Promise.all([
      this.prisma.assetStatus.findMany({ where: { active: true } }),
      this.prisma.assetCategory.findMany({ where: { active: true } }),
      this.prisma.location.findMany({ where: { active: true } }),
    ]);
    const statusByName = new Map(statuses.map((s) => [normalizeHeader(s.name), s.id]));
    const categoryByName = new Map(categories.map((c) => [normalizeHeader(c.name), c.id]));
    const locationByName = new Map(locations.map((l) => [normalizeHeader(l.name), l.id]));

    const cell = (row: ExcelJS.Row, key: string): string => {
      const col = colMap.get(key);
      if (col === undefined) return '';
      const v = row.getCell(col).value;
      if (v === null || v === undefined) return '';
      return String(v).trim();
    };

    const records: ParsedImportRow[] = [];
    const fileCodes = new Map<string, number>();

    for (const row of rows) {
      if (!row.hasValues) continue;
      const rowNumber = row.number;
      const issues: ImportIssue[] = [];

      const name = cell(row, 'name');
      let assetCode = cell(row, 'assetCode');
      const statusName = cell(row, 'status') || 'Bueno';
      const categoryName = cell(row, 'category');
      const locationName = cell(row, 'location');

      if (!name) {
        issues.push({ code: 'NAME_REQUIRED', message: 'Falta la denominación', level: 'error' });
      }

      if (assetCode) {
        if (fileCodes.has(assetCode)) {
          issues.push({ code: 'DUPLICATE_IN_FILE', message: `Código duplicado en el archivo (fila ${fileCodes.get(assetCode)})`, level: 'error' });
        } else {
          fileCodes.set(assetCode, rowNumber);
        }
        const exists = await this.prisma.asset.findUnique({ where: { assetCode } });
        if (exists) {
          issues.push({ code: 'DUPLICATE_DB', message: `El código ${assetCode} ya existe en el sistema`, level: 'error' });
        }
      }

      const statusKey = normalizeHeader(statusName);
      const statusId = statusByName.get(statusKey);
      if (!statusId) {
        issues.push({ code: 'UNKNOWN_STATUS', message: `Estado desconocido: "${statusName}"`, level: 'error' });
      }

      let categoryId: string | null = null;
      if (categoryName) {
        categoryId = categoryByName.get(normalizeHeader(categoryName)) ?? null;
        if (!categoryId) {
          issues.push({ code: 'UNKNOWN_CATEGORY', message: `Categoría desconocida: "${categoryName}"`, level: 'warning' });
        }
      }

      let locationId: string | null = null;
      if (locationName) {
        locationId = locationByName.get(normalizeHeader(locationName)) ?? null;
        if (!locationId) {
          issues.push({ code: 'UNKNOWN_LOCATION', message: `Ubicación desconocida: "${locationName}"`, level: 'warning' });
        }
      }

      records.push({
        row: rowNumber,
        assetCode: assetCode || undefined,
        name: name || undefined,
        description: cell(row, 'description') || undefined,
        brand: cell(row, 'brand') || undefined,
        model: cell(row, 'model') || undefined,
        serialNumber: cell(row, 'serialNumber') || undefined,
        statusId: statusId ?? undefined,
        statusName,
        categoryId: categoryId ?? undefined,
        locationId: locationId ?? undefined,
        issues,
      });
    }

    if (records.length === 0) {
      throw invalidData('No se encontraron filas de datos en el archivo');
    }

    const valid = records.filter((r) => !r.issues.some((i) => i.level === 'error'));
    const errors = records.filter((r) => r.issues.some((i) => i.level === 'error'));
    const warnings = records.filter((r) => !r.issues.some((i) => i.level === 'error') && r.issues.some((i) => i.level === 'warning'));

    const job = await this.prisma.importJob.create({
      data: {
        status: 'VALIDATED',
        filename,
        totalRows: records.length,
        validRows: valid.length,
        warningRows: warnings.length,
        duplicateRows: records.filter((r) => r.issues.some((i) => i.code.startsWith('DUPLICATE'))).length,
        errorRows: errors.length,
        createdById: userId,
      },
    });

    // Persistir filas válidas para la confirmación posterior
    const payload: StoredImport = { id: job.id, userId, records: valid };
    const file = join(this.tmpDir, `import-${job.id}.json`);
    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(file);
      stream.on('finish', () => resolve());
      stream.on('error', reject);
      stream.write(JSON.stringify(payload));
      stream.end();
    });

    return {
      jobId: job.id,
      summary: {
        totalRows: records.length,
        validRows: valid.length,
        warningRows: warnings.length,
        duplicateRows: job.duplicateRows,
        errorRows: errors.length,
      },
      issues: records.flatMap((r) =>
        r.issues.map((i) => ({ row: r.row, code: i.code, message: i.message, level: i.level })),
      ),
    };
  }

  async confirm(jobId: string, userId: string) {
    const job = await this.prisma.importJob.findUnique({ where: { id: jobId } });
    if (!job) throw notFound('Importación no encontrada');
    if (job.status !== 'VALIDATED') {
      throw invalidData('La importación no está en estado válido para confirmar');
    }

    const file = join(this.tmpDir, `import-${jobId}.json`);
    if (!existsSync(file)) {
      throw invalidData('La sesión de importación expiró. Vuelva a cargar el archivo.');
    }

    const payload = JSON.parse(await readFile(file, 'utf8')) as StoredImport;
    if (payload.userId !== userId) {
      throw invalidData('Esta importación pertenece a otro usuario');
    }

    let created = 0;
    const skipped = [] as string[];
    await this.prisma.withTransaction(async (tx) => {
      for (const record of payload.records) {
        const assetCode = record.assetCode ?? (await this.assetsService.generateNextAssetCode(tx));
        try {
          const asset = await tx.asset.create({
            data: {
              assetCode,
              name: record.name!,
              description: record.description ?? null,
              brand: record.brand ?? null,
              model: record.model ?? null,
              serialNumber: record.serialNumber ?? null,
              qrCode: undefined,
              statusId: record.statusId!,
              categoryId: record.categoryId ?? null,
              locationId: record.locationId ?? null,
              createdById: userId,
              updatedById: userId,
            },
          });
          if (!asset.qrCode) {
            await tx.asset.update({ where: { id: asset.id }, data: { qrCode: `inventario://asset/${asset.id}` } });
          }
          await this.audit.write(
            {
              userId,
              action: 'ASSET_IMPORT',
              entityType: 'Asset',
              entityId: asset.id,
              newValues: { assetCode, name: record.name },
              metadata: { importJobId: jobId, row: record.row },
            },
            tx,
          );
          created++;
        } catch (err) {
          this.logger.warn(`Fila ${record.row} omitida: ${(err as Error).message}`);
          skipped.push(String(record.row));
        }
      }

      await tx.importJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED', validRows: created, completedAt: new Date(), errorRows: skipped.length },
      });

      await this.audit.write(
        {
          userId,
          action: 'IMPORT_COMPLETED',
          entityType: 'ImportJob',
          entityId: jobId,
          newValues: { created, skipped: skipped.length },
          metadata: { filename: job.filename },
        },
        tx,
      );
    });

    void unlink(file).catch(() => undefined);

    return { imported: created, skipped: skipped.length, job: jobId };
  }

  async getJob(jobId: string) {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
      include: { errors: { orderBy: { rowNumber: 'asc' }, take: 100 } },
    });
    if (!job) throw notFound('Importación no encontrada');
    return job;
  }

  async listJobs(page = 1, pageSize = 20) {
    const total = await this.prisma.importJob.count();
    const items = await this.prisma.importJob.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { createdBy: { select: { id: true, name: true } } },
    });
    return {
      items,
      meta: { total, page, pageSize, totalPages: total === 0 ? 0 : Math.ceil(total / pageSize) },
    };
  }

  /** Plantilla base aceptada (columnas conocidas). */
  static readonly PREFIX = ASSET_CODE_PREFIX;
}