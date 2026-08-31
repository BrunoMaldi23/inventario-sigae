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
  denomination: string;
  inventoryCode: string;
  name: string;
  description?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  statusId?: string;
  statusName?: string;
  categoryId?: string;
  categoryName?: string;
  locationId?: string;
  locationName?: string;
  responsibleId?: string;
  responsibleName?: string;
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

function normalizeLookup(value: string): string {
  return normalizeHeader(value)
    .replace(/[.,;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const SYNONYMS: Record<string, string[]> = {
  assetCode: ['codigo del bien', 'codigo bien', 'codigo completo', 'codigo', 'asset code'],
  denomination: ['denominacion', 'rbd', 'prefijo'],
  inventoryCode: ['codigo de inventario', 'código de inventario', 'codigo inventario', 'código inventario', 'numero inventario', 'numero de inventario', 'n inventario'],
  name: ['nombre', 'nombre del bien', 'bien', 'denominacion del bien'],
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

const HM_LOCATION_BY_SHEET: Record<string, { location: string; floor?: string; responsible?: string; rut?: string }> = {
  '1': { location: 'Biblioteca', floor: 'Seundo piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '2': { location: 'Bodega banda escolar', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '3': { location: 'Bodega de amplificación', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '4': { location: 'Bodega de dirección', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '5': { location: 'Bodega de estufas', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '6': { location: 'Bodega de gimnasio', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '7': { location: 'Bodega PIE', floor: 'Segundo piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '8': { location: 'Box dental', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '9': { location: 'Casino de alumnos', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '10': { location: 'Central de apuntes', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '11': { location: 'Cocina de profesores', floor: 'Segundo piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '12': { location: 'Cocina profesores (sector bodega)', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '13': { location: 'Enfermería', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '14': { location: 'Gimnasio', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '15': { location: 'Hall acceso principal', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '16': { location: 'Oficina de atención apoderados', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '17': { location: 'Oficina de coordinadora PIE', floor: 'Segundo piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '18': { location: 'Oficina departamento de lenguaje', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '19': { location: 'Oficina de dirección', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '20': { location: 'Oficina de encargada de centro de estudiantes', floor: 'Segundo piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '21': { location: 'Oficina de encargado de adquisisiones', floor: 'Segundo piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '22': { location: 'Oficina de Fonoaudiología', floor: 'Segundo piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '23': { location: 'Oficina de inspectoría general', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '24': { location: 'Oficina de inspectoría pasillo', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '25': { location: 'Oficina de Psicología', floor: 'Segundo piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '26': { location: 'Oficina de secretaría', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '27': { location: 'Oficina encargado convivencia', floor: 'Segundo piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '28': { location: 'Oficina orientadora', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '29': { location: 'Oficina psicóloga 2', floor: 'Segundo piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '30': { location: 'Oficina trabajadora social', floor: 'Segundo piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '31': { location: 'Oficina unidad técnica', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '32': { location: 'Pasillo', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '33': { location: 'Pasillo bodega de ampificación', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '34': { location: 'Pasillo oficinas', floor: 'Segundo piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '35': { location: 'Pasillo oficinas PIE', floor: 'Segundo piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '36': { location: 'Pasillo sector sur', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '37': { location: 'Patio párvulo', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '38': { location: 'Sala de cuarto básico A', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '39': { location: 'Sala de cuarto básico B', floor: 'Segundo piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '40': { location: 'Sala educadora diferencial N°1', floor: 'Segundo piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '41': { location: 'Sala de integración', floor: 'Segundo piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
  '42': { location: 'Sala de integración escolar', floor: 'Primer piso', responsible: 'Gabriel Rolando Torres Romero', rut: '10.134.333-2' },
};

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

function cellToString(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return '';

  const text = String(cell.text ?? '').trim();
  if (text) return text;

  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? '').join('').trim();
    }
    if ('text' in value && value.text !== undefined) return String(value.text).trim();
    if ('result' in value && value.result !== undefined) return String(value.result).trim();
    if ('hyperlink' in value && value.hyperlink !== undefined) return String(value.hyperlink).trim();
  }

  return String(value).trim();
}

function normalizeAssetPart(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '')
    .replace(/[‐‑‒–—]/g, '-');
}

function isMissingCode(value: string): boolean {
  const key = normalizeLookup(value).replace(/\s+/g, '');
  return !key || key === 'sincodigo' || key === 's/codigo' || key === 'scodigo' || key === 's/n' || key === 'sn';
}

function parseAssetCode(
  rawAssetCode: string,
  rawDenomination: string,
  rawInventoryCode: string,
  allowMissingCode = false,
): { assetCode?: string; denomination: string; inventoryCode: string } {
  if (allowMissingCode && isMissingCode(rawAssetCode) && !rawInventoryCode) {
    return { denomination: ASSET_CODE_PREFIX, inventoryCode: '' };
  }

  const fullCode = normalizeAssetPart(rawAssetCode);
  const denomination = normalizeAssetPart(rawDenomination).toUpperCase();
  const inventoryCode = normalizeAssetPart(rawInventoryCode);

  if (fullCode) {
    const match = fullCode.match(/^([A-Za-z0-9]+)-(.+)$/);
    if (match) {
      return {
        assetCode: `${match[1]!.toUpperCase()}-${match[2]!}`,
        denomination: denomination || match[1]!.toUpperCase(),
        inventoryCode: inventoryCode || match[2]!,
      };
    }

    return {
      assetCode: denomination ? `${denomination}-${fullCode}` : '',
      denomination,
      inventoryCode: inventoryCode || fullCode,
    };
  }

  return {
    assetCode: denomination && inventoryCode ? `${denomination}-${inventoryCode}` : undefined,
    denomination,
    inventoryCode,
  };
}

function normalizeStatusName(value: string): string {
  const key = normalizeLookup(value || 'Bueno');
  const aliases: Record<string, string> = {
    buena: 'bueno',
    buenas: 'bueno',
    bueno: 'bueno',
    regular: 'regular',
    malo: 'malo',
    mala: 'malo',
    malas: 'malo',
    malos: 'malo',
    reparacion: 'en reparacion',
    'en reparacion': 'en reparacion',
    mantencion: 'en mantencion',
    'en mantencion': 'en mantencion',
    baja: 'de baja',
    'de baja': 'de baja',
  };
  return aliases[key] ?? key;
}

function inferCategoryName(name: string): string | undefined {
  const key = normalizeLookup(name);
  if (/(silla|mesa|escritorio|estante|repisa|mueble|pupitre|pizarra|locker|gabinete)/.test(key)) return 'Mobiliario';
  if (/(notebook|computador|desktop|monitor|impresora|tablet|all in one|teclado|mouse|router|switch)/.test(key)) return 'Tecnología';
  if (/(proyector|telon|televisor|tv|parlante|microfono|amplificador|radio)/.test(key)) return 'Audiovisual';
  if (/(balon|colchoneta|arco|red|implemento deportivo)/.test(key)) return 'Deportivo';
  if (/(microscopio|laboratorio|matraz|balanza)/.test(key)) return 'Laboratorio';
  if (/(cocina|refrigerador|horno|microondas|lavafondos|vajilla)/.test(key)) return 'Cocina';
  return undefined;
}

function isHmPlaceholderRow(row: ExcelJS.Row): boolean {
  const first = normalizeLookup(cellToString(row.getCell(1)));
  const second = normalizeLookup(cellToString(row.getCell(2)));
  const third = normalizeLookup(cellToString(row.getCell(3)));
  return first === 'columna1' || first === 'denominacion del bien' || Boolean(first && first === second && first === third);
}

function looksLikeHmSheet(sheet: ExcelJS.Worksheet, colMap: Map<string, number>): boolean {
  if (colMap.has('name') && (colMap.has('assetCode') || colMap.has('inventoryCode'))) return false;
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 10); rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (!row.hasValues || isHmPlaceholderRow(row)) continue;
    const values = [1, 2, 3, 4, 5, 6, 7].map((col) => cellToString(row.getCell(col)));
    if (values[0] && values[2] && values[5] && values[6]) return true;
  }
  return false;
}

function hmCell(row: ExcelJS.Row, column: number): string {
  return cellToString(row.getCell(column));
}

function hmSheetNumber(filename: string, sheet: ExcelJS.Worksheet): string | undefined {
  if (/^\d+$/.test(sheet.name)) return sheet.name;
  return filename.match(/^(\d+)/)?.[1];
}

function hmHeaderValue(sheet: ExcelJS.Worksheet, label: string): string {
  const expected = normalizeLookup(label);
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 25); rowNumber++) {
    const row = sheet.getRow(rowNumber);
    for (let col = 1; col <= Math.min(row.cellCount || 14, 14); col++) {
      if (normalizeLookup(cellToString(row.getCell(col))).replace(/:$/, '') !== expected) continue;
      for (let valueCol = col + 1; valueCol <= Math.min(col + 6, 14); valueCol++) {
        const value = cellToString(row.getCell(valueCol));
        if (value) return value;
      }
    }
  }
  return '';
}

function hmMetadata(filename: string, sheet: ExcelJS.Worksheet) {
  const sheetNumber = hmSheetNumber(filename, sheet);
  const mapped = sheetNumber ? HM_LOCATION_BY_SHEET[sheetNumber] : undefined;
  return {
    location: hmHeaderValue(sheet, 'Ubicación') || mapped?.location,
    floor: hmHeaderValue(sheet, 'Piso') || mapped?.floor,
    responsible: hmHeaderValue(sheet, 'Nombre de Funcionario') || mapped?.responsible,
    rut: hmHeaderValue(sheet, 'RUT') || mapped?.rut,
  };
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

    const sheet = workbook.getWorksheet('Carga') ?? workbook.worksheets[0];
    if (!sheet) throw invalidData('El archivo no tiene hojas de cálculo');

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

    const hmLayout = looksLikeHmSheet(sheet, colMap);
    const hmMeta: { location?: string; floor?: string; responsible?: string; rut?: string } = hmLayout
      ? hmMetadata(filename, sheet)
      : {};
    if (hmLayout) {
      colMap.set('name', 1);
      colMap.set('locationFloor', 2);
      colMap.set('location', 3);
      colMap.set('responsible', 4);
      colMap.set('responsibleRut', 5);
      colMap.set('description', 6);
      colMap.set('assetCode', 7);
      colMap.set('status', 8);
    }

    const hasAssetCode = colMap.has('assetCode');
    const hasDenomination = colMap.has('denomination');
    const hasInventoryCode = colMap.has('inventoryCode');
    const hasName = colMap.has('name');

    if (!hasAssetCode && (!hasDenomination || !hasInventoryCode)) {
      throw invalidData('La plantilla debe incluir Código del bien o las columnas Denominación y Código de Inventario');
    }
    if (!hasName) {
      throw invalidData('La plantilla no incluye columna de Nombre (obligatoria)');
    }

    const rows = sheet.getRows(hmLayout ? 1 : 2, hmLayout ? sheet.rowCount : sheet.rowCount - 1) ?? [];

    const [statuses, categories, locations, responsables] = await Promise.all([
      this.prisma.assetStatus.findMany({ where: { active: true } }),
      this.prisma.assetCategory.findMany({ where: { active: true } }),
      this.prisma.location.findMany({ where: { active: true } }),
      this.prisma.responsible.findMany({ where: { active: true } }),
    ]);

    const statusByName = new Map<string, string>(statuses.map((s) => [normalizeStatusName(s.name), s.id]));
    const categoryByName = new Map<string, string>();
    for (const category of categories) {
      categoryByName.set(normalizeHeader(category.name), category.id);
    }
    const locationByName = new Map<string, string>();
    for (const location of locations) {
      locationByName.set(normalizeHeader(location.name), location.id);
    }
    const responsibleByName = new Map<string, string>(responsables.map((r) => [normalizeHeader(r.name), r.id]));

    const cell = (row: ExcelJS.Row, key: string): string => {
      const col = colMap.get(key);
      if (col === undefined) return '';
      return cellToString(row.getCell(col));
    };

    const records: ParsedImportRow[] = [];
    const fileCodes = new Map<string, number>();
    const codesToCheckInDb = new Set<string>();

    for (const row of rows) {
      if (!row.hasValues) continue;
      if (hmLayout && isHmPlaceholderRow(row)) continue;
      const rowNumber = row.number;
      const issues: ImportIssue[] = [];

      const rawAssetCode = cell(row, 'assetCode');
      const parsedCode = parseAssetCode(rawAssetCode, cell(row, 'denomination'), cell(row, 'inventoryCode'), hmLayout);
      let { assetCode } = parsedCode;
      const { denomination, inventoryCode } = parsedCode;
      const name = cell(row, 'name') || '';
      const sourceLocationName = hmLayout ? hmCell(row, 3) : '';
      const locationFloor = hmLayout ? hmMeta.floor || hmCell(row, 2) : '';
      const responsibleRut = hmLayout ? hmMeta.rut || hmCell(row, 5) : '';

      if (!assetCode && !hmLayout) {
        issues.push({ code: 'ASSET_CODE_REQUIRED', message: 'Falta el Código del bien o Denominación + Código de Inventario', level: 'error' });
      }
      if (denomination && denomination !== ASSET_CODE_PREFIX) {
        issues.push({ code: 'INVALID_DENOMINATION', message: `Denominación esperada es: ${ASSET_CODE_PREFIX}`, level: 'warning' });
      }

      if (!name) {
        issues.push({ code: 'NAME_REQUIRED', message: 'Falta el nombre del bien', level: 'error' });
      }

      const rawStatusName = cell(row, 'status') || 'Bueno';
      const statusKey = normalizeStatusName(rawStatusName);
      const statusId = statusByName.get(statusKey);
      if (!statusId) {
        issues.push({ code: 'UNKNOWN_STATUS', message: `Estado desconocido: "${rawStatusName}". Se usará "Bueno" si confirma la importación.`, level: 'warning' });
      }

      // Validar category
      let categoryId: string | null = null;
      const categoryName = cell(row, 'category') || (hmLayout ? inferCategoryName(name) ?? '' : '');
      if (categoryName) {
        categoryId = categoryByName.get(normalizeHeader(categoryName)) ?? null;
        if (!categoryId && !hmLayout) {
          issues.push({ code: 'UNKNOWN_CATEGORY', message: `Categoría desconocida: "${categoryName}"`, level: 'warning' });
        }
      }

      // Validar location
      let locationId: string | null = null;
      const locationName = (hmLayout ? hmMeta.location || sourceLocationName : cell(row, 'location')) || '';
      if (locationName) {
        locationId = locationByName.get(normalizeHeader(locationName)) ?? null;
        if (!locationId && !hmLayout) {
          issues.push({ code: 'UNKNOWN_LOCATION', message: `Ubicación desconocida: "${locationName}"`, level: 'warning' });
        }
      }

      // Validar y resolver responsible
      let responsibleId: string | null = null;
      const responsableName = (hmLayout ? hmMeta.responsible || cell(row, 'responsible') : cell(row, 'responsible')) || '';
      if (responsableName) {
        responsibleId = responsibleByName.get(normalizeHeader(responsableName)) ?? null;
        if (!responsibleId && !hmLayout) {
          issues.push({ code: 'UNKNOWN_RESPONSIBLE', message: `Responsable desconocido: "${responsableName}"`, level: 'warning' });
        }
      }

      // Detectar duplicados usando assetCode completo
      if (assetCode) {
        if (fileCodes.has(assetCode)) {
          if (hmLayout) {
            issues.push({ code: 'DUPLICATE_IN_FILE', message: `Código original duplicado; se generará código interno (fila ${fileCodes.get(assetCode)})`, level: 'warning' });
            assetCode = undefined;
          } else {
            issues.push({ code: 'DUPLICATE_IN_FILE', message: `Código de bien duplicado en el archivo (fila ${fileCodes.get(assetCode)})`, level: 'error' });
          }
        } else {
          fileCodes.set(assetCode, rowNumber);
          codesToCheckInDb.add(assetCode);
        }
      }

      records.push({
        row: rowNumber,
        assetCode,
        denomination,
        inventoryCode,
        name,
        description: [
          cell(row, 'description'),
          hmLayout && rawAssetCode && !assetCode && !isMissingCode(rawAssetCode) ? `Código original: ${rawAssetCode}` : '',
          hmLayout && sourceLocationName && locationName && normalizeLookup(sourceLocationName) !== normalizeLookup(locationName) ? `Ubicación detalle origen: ${sourceLocationName}` : '',
          locationFloor ? `Sector: ${locationFloor}` : '',
          responsibleRut ? `RUT responsable: ${responsibleRut}` : '',
        ]
          .filter(Boolean)
          .join(' | ') || undefined,
        brand: cell(row, 'brand') || undefined,
        model: cell(row, 'model') || undefined,
        serialNumber: cell(row, 'serialNumber') || undefined,
        statusId: statusId ?? statusByName.get('bueno') ?? undefined,
        statusName: statusId ? rawStatusName : 'Bueno',
        categoryId: categoryId ?? undefined,
        categoryName: categoryName || undefined,
        locationId: locationId ?? undefined,
        locationName: locationName || undefined,
        responsibleId: responsibleId ?? undefined,
        responsibleName: responsableName || undefined,
        issues,
      });
    }

    if (codesToCheckInDb.size > 0) {
      const existingCodes = new Set(
        (
          await this.prisma.asset.findMany({
            where: { assetCode: { in: [...codesToCheckInDb] } },
            select: { assetCode: true },
          })
        ).map((asset) => asset.assetCode),
      );

      for (const record of records) {
        if (!record.assetCode || !existingCodes.has(record.assetCode)) continue;
        if (hmLayout) {
          record.issues.push({
            code: 'DUPLICATE_DB',
            message: `El código original ${record.assetCode} ya existe; se generará código interno`,
            level: 'warning',
          });
          record.description = [record.description, `Código original: ${record.assetCode}`].filter(Boolean).join(' | ');
          record.assetCode = undefined;
        } else {
          record.issues.push({
            code: 'DUPLICATE_DB',
            message: `El código de bien ${record.assetCode} ya existe en el sistema`,
            level: 'error',
          });
        }
      }
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
      rows: records.map((r) => ({
        row: r.row,
        assetCode: r.assetCode,
        name: r.name,
        description: r.description,
        brand: r.brand,
        model: r.model,
        serialNumber: r.serialNumber,
        statusName: r.statusName,
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        locationId: r.locationId,
        locationName: r.locationName,
        responsibleId: r.responsibleId,
        responsibleName: r.responsibleName,
        issues: r.issues,
      })),
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
    const batchSize = 25;
    const categoryCache = new Map<string, string | null>();
    const locationCache = new Map<string, string | null>();
    const responsibleCache = new Map<string, string | null>();

    for (let start = 0; start < payload.records.length; start += batchSize) {
      const batch = payload.records.slice(start, start + batchSize);
      await this.prisma.withTransaction(async (tx) => {
      const findOrCreateCategory = async (name?: string) => {
        if (!name) return null;
        const key = normalizeHeader(name);
        if (categoryCache.has(key)) return categoryCache.get(key) ?? null;
        const existing = await tx.assetCategory.findFirst({
          where: { name: { equals: name, mode: 'insensitive' }, parentId: null },
        });
        if (existing) {
          categoryCache.set(key, existing.id);
          return existing.id;
        }
        const created = await tx.assetCategory.create({
          data: { name, description: 'Creada automáticamente desde importación Excel' },
        });
        categoryCache.set(key, created.id);
        return created.id;
      };

      const findOrCreateLocation = async (name?: string) => {
        if (!name) return null;
        const key = normalizeHeader(name);
        if (locationCache.has(key)) return locationCache.get(key) ?? null;
        const existing = await tx.location.findFirst({
          where: { name: { equals: name, mode: 'insensitive' }, parentId: null },
        });
        if (existing) {
          locationCache.set(key, existing.id);
          return existing.id;
        }
        const created = await tx.location.create({
          data: {
            name,
            type: 'other',
            description: 'Creada automáticamente desde importación Excel',
          },
        });
        locationCache.set(key, created.id);
        return created.id;
      };

      const findOrCreateResponsible = async (name?: string, locationId?: string | null) => {
        if (!name) return null;
        const key = normalizeHeader(name);
        if (responsibleCache.has(key)) return responsibleCache.get(key) ?? null;
        const existing = await tx.responsible.findFirst({
          where: { name: { equals: name, mode: 'insensitive' } },
        });
        if (existing) {
          responsibleCache.set(key, existing.id);
          return existing.id;
        }
        const created = await tx.responsible.create({
          data: {
            name,
            locationId: locationId ?? null,
            role: 'Responsable importado',
          },
        });
        responsibleCache.set(key, created.id);
        return created.id;
      };

      for (const record of batch) {
        const assetCode = record.assetCode ?? (await this.assetsService.generateNextAssetCode(tx));
        try {
          const existingAsset = await tx.asset.findUnique({
            where: { assetCode },
            select: { id: true },
          });
          if (existingAsset) {
            created++;
            continue;
          }

          const locationId = record.locationId ?? (await findOrCreateLocation(record.locationName));
          const categoryId = record.categoryId ?? (await findOrCreateCategory(record.categoryName));
          const responsibleId = record.responsibleId ?? (await findOrCreateResponsible(record.responsibleName, locationId));

          const asset = await tx.asset.create({
            data: {
              assetCode,
              name: record.name,
              description: record.description ?? null,
              brand: record.brand ?? null,
              model: record.model ?? null,
              serialNumber: record.serialNumber ?? null,
              qrCode: undefined,
              statusId: record.statusId!,
              categoryId,
              locationId,
              responsibleId,
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
      });
    }

    await this.prisma.withTransaction(async (tx) => {
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
