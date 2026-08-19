/**
 * Tipos compartidos del sistema de inventario escolar.
 * Fuente única para contratos entre API, Web y Móvil.
 */

export type ID = string;

export type UUID = string;

/* ------------------------------------------------------------------ */
/* Roles y permisos                                                    */
/* ------------------------------------------------------------------ */

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMINISTRADOR: 'ADMINISTRADOR',
  ENCARGADO_INVENTARIO: 'ENCARGADO_INVENTARIO',
  DIRECCION: 'DIRECCION',
  FUNCIONARIO: 'FUNCIONARIO',
  LECTURA: 'LECTURA',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  ASSET_READ: 'asset.read',
  ASSET_CREATE: 'asset.create',
  ASSET_UPDATE: 'asset.update',
  ASSET_TRANSFER: 'asset.transfer',
  ASSET_DISPOSE: 'asset.dispose',
  ASSET_STATUS: 'asset.status',
  ASSET_DELETE: 'asset.delete',
  MOVEMENT_READ: 'movement.read',
  MOVEMENT_CREATE: 'movement.create',
  ATTACHMENT_UPLOAD: 'attachment.upload',
  ATTACHMENT_DELETE: 'attachment.delete',
  LOCATION_MANAGE: 'location.manage',
  CATEGORY_MANAGE: 'category.manage',
  STATUS_MANAGE: 'status.manage',
  RESPONSIBLE_MANAGE: 'responsible.manage',
  REPORT_EXPORT: 'report.export',
  INVENTORY_IMPORT: 'inventory.import',
  INVENTORY_COUNT: 'inventory.count',
  AUDIT_READ: 'audit.read',
  USER_MANAGE: 'user.manage',
  ROLE_MANAGE: 'role.manage',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface RoleDTO {
  id: UUID;
  name: RoleName;
  description: string | null;
  active: boolean;
  permissions: PermissionCode[];
}

/* ------------------------------------------------------------------ */
/* Usuario                                                             */
/* ------------------------------------------------------------------ */

export interface UserDTO {
  id: UUID;
  email: string;
  name: string;
  roleId: UUID;
  role?: RoleDTO;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Usuario autenticado embebido en la sesión / JWT. */
export interface AuthUser {
  id: UUID;
  email: string;
  name: string;
  roleId: UUID;
  role: RoleName;
  permissions: PermissionCode[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/* ------------------------------------------------------------------ */
/* Ubicaciones                                                         */
/* ------------------------------------------------------------------ */

export type LocationType =
  | 'building'
  | 'floor'
  | 'classroom'
  | 'office'
  | 'warehouse'
  | 'library'
  | 'laboratory'
  | 'gym'
  | 'common_area'
  | 'other';

export interface LocationDTO {
  id: UUID;
  name: string;
  type: LocationType;
  parentId: UUID | null;
  active: boolean;
  description: string | null;
  /** Ruta jerárquica legible, por ejemplo "Escuela / Primer piso / 3° B". */
  path?: string | null;
  children?: LocationDTO[];
  assetCount?: number;
}

export interface LocationTreeNode extends LocationDTO {
  children: LocationTreeNode[];
}

/* ------------------------------------------------------------------ */
/* Categoría y estado                                                  */
/* ------------------------------------------------------------------ */

export interface CategoryDTO {
  id: UUID;
  name: string;
  parentId: UUID | null;
  active: boolean;
  description: string | null;
  children?: CategoryDTO[];
}

export interface AssetStatusDTO {
  id: UUID;
  name: string;
  color: string;
  sortOrder: number;
  active: boolean;
}

/* ------------------------------------------------------------------ */
/* Responsable                                                         */
/* ------------------------------------------------------------------ */

export interface ResponsibleDTO {
  id: UUID;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  locationId: UUID | null;
  active: boolean;
}

export interface ResponsibleWithLocationDTO extends ResponsibleDTO {
  location?: LocationDTO | null;
}

/* ------------------------------------------------------------------ */
/* Bien (Asset)                                                        */
/* ------------------------------------------------------------------ */

export type AssetMovementType =
  | 'TRANSFER'
  | 'ASSIGNMENT'
  | 'RETURN'
  | 'LOAN'
  | 'REPAIR'
  | 'MAINTENANCE'
  | 'STORAGE'
  | 'DISPOSAL'
  | 'STATUS_CHANGE'
  | 'OTHER';

export interface AssetDTO {
  id: UUID;
  assetCode: string;
  name: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  qrCode: string | null;
  barcode: string | null;
  categoryId: UUID | null;
  statusId: UUID;
  locationId: UUID | null;
  responsibleId: UUID | null;
  acquisitionDate: string | null;
  acquisitionValue: number | null;
  supplier: string | null;
  invoiceNumber: string | null;
  purchaseOrder: string | null;
  fundingSource: string | null;
  provenance: string | null;
  notes: string | null;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  category?: CategoryDTO | null;
  status?: AssetStatusDTO | null;
  location?: LocationDTO | null;
  responsible?: ResponsibleDTO | null;
  assetCount?: number;
}

export interface LastMovementSummary {
  type: AssetMovementType;
  createdAt: string;
  fromLocationName: string | null;
  toLocationName: string | null;
}

export interface AssetListItemDTO extends AssetDTO {
  lastMovement?: LastMovementSummary | null;
}

/* ------------------------------------------------------------------ */
/* Movimiento                                                          */
/* ------------------------------------------------------------------ */

export interface AssetMovementDTO {
  id: UUID;
  assetId: UUID;
  type: AssetMovementType;
  fromLocationId: UUID | null;
  toLocationId: UUID | null;
  fromResponsibleId: UUID | null;
  toResponsibleId: UUID | null;
  fromStatusId: UUID | null;
  toStatusId: UUID | null;
  reason: string;
  notes: string | null;
  performedById: UUID;
  createdAt: string;
  asset?: AssetDTO | null;
  fromLocation?: LocationDTO | null;
  toLocation?: LocationDTO | null;
  fromStatus?: AssetStatusDTO | null;
  toStatus?: AssetStatusDTO | null;
  performedBy?: UserDTO | null;
}

export interface AssetHistoryResponse {
  asset: AssetDTO;
  movements: AssetMovementDTO[];
}

/* ------------------------------------------------------------------ */
/* Auditoría                                                           */
/* ------------------------------------------------------------------ */

export interface AuditLogDTO {
  id: UUID;
  userId: UUID | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: UserDTO | null;
}

/* ------------------------------------------------------------------ */
/* Adjuntos                                                            */
/* ------------------------------------------------------------------ */

export type AttachmentType =
  | 'PHOTO'
  | 'DOCUMENT'
  | 'INVOICE'
  | 'PURCHASE'
  | 'ACT'
  | 'DISPOSAL'
  | 'OTHER';

export interface AttachmentDTO {
  id: UUID;
  assetId: UUID;
  type: AttachmentType;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedById: UUID;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Import / Export                                                     */
/* ------------------------------------------------------------------ */

export interface ImportResult {
  observed: number;
  valid: number;
  warnings: number;
  duplicates: number;
  errors: ImportRowError[];
}

export interface ImportRowError {
  row: number;
  code: string;
  message: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

/* ------------------------------------------------------------------ */
/* API wrapper                                                         */
/* ------------------------------------------------------------------ */

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}