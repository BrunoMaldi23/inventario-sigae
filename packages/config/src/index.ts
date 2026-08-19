import { LocationType, AssetMovementType, PermissionCode } from '@inventario/types';

/** Constantes y catálogos compartidos del sistema. */

export const SCHOOL_NAME = 'Inventario Escolar';

export const ASSET_CODE_PREFIX = 'INV';

export const ASSET_CODE_INDEX_MIN = 1;

export const ASSET_CODE_PAD = 6;

export const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: 'building', label: 'Edificio' },
  { value: 'floor', label: 'Piso' },
  { value: 'classroom', label: 'Sala / Curso' },
  { value: 'office', label: 'Oficina' },
  { value: 'warehouse', label: 'Bodega' },
  { value: 'library', label: 'Biblioteca' },
  { value: 'laboratory', label: 'Laboratorio' },
  { value: 'gym', label: 'Gimnasio' },
  { value: 'common_area', label: 'Área común' },
  { value: 'other', label: 'Otro' },
];

export const MOVEMENT_TYPES: { value: AssetMovementType; label: string }[] = [
  { value: 'TRANSFER', label: 'Traslado' },
  { value: 'ASSIGNMENT', label: 'Asignación' },
  { value: 'RETURN', label: 'Retorno' },
  { value: 'LOAN', label: 'Préstamo' },
  { value: 'REPAIR', label: 'Reparación' },
  { value: 'MAINTENANCE', label: 'Mantención' },
  { value: 'STORAGE', label: 'Guardado / Bodega' },
  { value: 'DISPOSAL', label: 'Baja' },
  { value: 'STATUS_CHANGE', label: 'Cambio de estado' },
  { value: 'OTHER', label: 'Otro' },
];

export const TRANSFER_REASONS: { value: string; label: string }[] = [
  { value: 'REUBICACION', label: 'Reubicación' },
  { value: 'PRESTAMO', label: 'Préstamo' },
  { value: 'REPARACION', label: 'Reparación' },
  { value: 'MANTENCION', label: 'Mantención' },
  { value: 'ALMACENAMIENTO', label: 'Almacenamiento' },
  { value: 'CAMBIO_RESPONSABLE', label: 'Cambio de responsable' },
  { value: 'BAJA', label: 'Baja' },
  { value: 'RECUENTO', label: 'Recuento físico' },
  { value: 'OTRO', label: 'Otro' },
];

export const DEFAULT_CATEGORIES: { name: string; children?: string[] }[] = [
  { name: 'Mobiliario', children: ['Silla', 'Mesa', 'Escritorio', 'Estante', 'Pizarra'] },
  { name: 'Tecnología', children: ['Notebook', 'Desktop', 'Tablet', 'Proyector', 'Accesorio'] },
  { name: 'Computación' },
  { name: 'Audiovisual', children: ['Televisor', 'Parlante', 'Micrófono', 'Amplificador'] },
  { name: 'Laboratorio', children: ['Microscopio', 'Material de laboratorio'] },
  { name: 'Deportivo', children: ['Balón', 'Implemento deportivo'] },
  { name: 'Electricidad', children: ['Herramienta eléctrica', 'Cableado', 'Iluminación'] },
  { name: 'Herramientas' },
  { name: 'PIE', children: ['Equipamiento PIE'] },
  { name: 'Biblioteca', children: ['Estantería', 'Material bibliográfico'] },
  { name: 'Cocina', children: ['Electrodoméstico', 'Utensilio'] },
  { name: 'Oficina', children: ['Sillas de oficina', 'Escritorio de oficina'] },
  { name: 'Otros' },
];

export const DEFAULT_STATUSES: { name: string; color: string }[] = [
  { name: 'Bueno', color: '#16a34a' },
  { name: 'Regular', color: '#f59e0b' },
  { name: 'Malo', color: '#ef4444' },
  { name: 'En reparación', color: '#f97316' },
  { name: 'En mantención', color: '#0ea5e9' },
  { name: 'De baja', color: '#6b7280' },
  { name: 'Extraviado', color: '#000000' },
  { name: 'No localizado', color: '#475569' },
  { name: 'Prestado', color: '#a855f7' },
  { name: 'Fuera de servicio', color: '#dc2626' },
];

/**
 * Mapa de permisos por rol (seed inicial).
 * Los permisos se verifican en el backend independientemente de la UI.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  SUPER_ADMIN: Object.values({
    asset: 'asset.read',
    assetCreate: 'asset.create',
    assetUpdate: 'asset.update',
    assetTransfer: 'asset.transfer',
    assetDispose: 'asset.dispose',
    assetStatus: 'asset.status',
    assetDelete: 'asset.delete',
    movementRead: 'movement.read',
    movementCreate: 'movement.create',
    attachmentUpload: 'attachment.upload',
    attachmentDelete: 'attachment.delete',
    locationManage: 'location.manage',
    categoryManage: 'category.manage',
    statusManage: 'status.manage',
    responsibleManage: 'responsible.manage',
    reportExport: 'report.export',
    inventoryImport: 'inventory.import',
    inventoryCount: 'inventory.count',
    auditRead: 'audit.read',
    userManage: 'user.manage',
    roleManage: 'role.manage',
  }) as PermissionCode[],
  ADMINISTRADOR: [
    'asset.read',
    'asset.create',
    'asset.update',
    'asset.transfer',
    'asset.dispose',
    'asset.status',
    'movement.read',
    'movement.create',
    'attachment.upload',
    'attachment.delete',
    'location.manage',
    'category.manage',
    'status.manage',
    'responsible.manage',
    'report.export',
    'inventory.import',
    'audit.read',
  ],
  ENCARGADO_INVENTARIO: [
    'asset.read',
    'asset.create',
    'asset.update',
    'asset.transfer',
    'asset.dispose',
    'asset.status',
    'movement.read',
    'movement.create',
    'attachment.upload',
    'report.export',
    'inventory.import',
    'inventory.count',
  ],
  DIRECCION: ['asset.read', 'movement.read', 'report.export', 'audit.read'],
  FUNCIONARIO: [
    'asset.read',
    'asset.transfer',
    'asset.status',
    'movement.read',
    'movement.create',
    'attachment.upload',
  ],
  LECTURA: ['asset.read', 'movement.read'],
};

/** Zona horaria oficial de presentación (Chile). */
export const APP_TIMEZONE = 'America/Santiago';

export const ISO_DATE_FORMAT = 'yyyy-MM-dd';

export const EXCEL_EXPORT_FILENAME_PREFIX = 'Inventario_Escuela';