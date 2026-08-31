export type RoleName = "SUPER_ADMIN" | "ADMINISTRADOR" | "ENCARGADO_INVENTARIO" | "DIRECCION" | "FUNCIONARIO" | "LECTURA";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  role: RoleName;
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface CategoryDTO {
  id: string;
  name: string;
  description?: string | null;
  parentId: string | null;
  active: boolean;
}

export interface CategoryTreeNode extends CategoryDTO {
  children: CategoryTreeNode[];
}

export interface AssetStatusDTO {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  active: boolean;
}

export interface LocationDTO {
  id: string;
  name: string;
  type: "building" | "cycle" | "floor" | "classroom" | "office" | "warehouse" | "library" | "laboratory" | "gym" | "common_area" | "other";
  parentId: string | null;
  path?: string | null;
  active: boolean;
  description?: string | null;
  assetCount?: number;
}

export interface LocationTreeNode extends LocationDTO {
  children: LocationTreeNode[];
}

export interface ResponsibleDTO {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  locationId: string | null;
  active: boolean;
}

export interface AssetLocationMini {
  id: string;
  name: string;
  type: LocationDTO["type"];
  parentId: string | null;
  path?: string | null;
  active: boolean;
  description?: string | null;
}

export interface AssetDTO {
  id: string;
  assetCode: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  qrCode?: string | null;
  barcode?: string | null;
  categoryId: string | null;
  statusId: string | null;
  locationId: string | null;
  responsibleId: string | null;
  acquisitionDate?: string | null;
  acquisitionValue?: number | null;
  supplier?: string | null;
  invoiceNumber?: string | null;
  purchaseOrder?: string | null;
  fundingSource?: string | null;
  provenance?: string | null;
  notes?: string | null;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  category: CategoryDTO | null;
  status: AssetStatusDTO | null;
  location: AssetLocationMini | null;
  responsible: ResponsibleDTO | null;
  lastMovement?: {
    type: string;
    createdAt: string;
    toLocationName?: string | null;
    fromLocationName?: string | null;
  } | null;
}

export interface AssetMovementDTO {
  id: string;
  assetId: string;
  type: "TRANSFER" | "STATUS_CHANGE" | "ASSIGNMENT" | "RETURN" | "ADJUSTMENT" | "DISPATCH" | "RECEIVED" | "MAINTENANCE" | "DISPOSAL";
  fromLocationId: string | null;
  toLocationId: string | null;
  fromResponsibleId: string | null;
  toResponsibleId: string | null;
  reason: string;
  notes?: string | null;
  performedById: string | null;
  createdAt: string;
  fromLocation?: Pick<AssetLocationMini, "id" | "name" | "type" | "parentId" | "active" | "description" | "path"> | null;
  toLocation?: Pick<AssetLocationMini, "id" | "name" | "type" | "parentId" | "active" | "description" | "path"> | null;
  performedBy?: { id: string; name: string; email: string } | null;
}

export interface AssetHistory {
  asset: AssetDTO;
  movements: AssetMovementDTO[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export interface AttachmentDTO {
  id: string;
  assetId: string;
  filename: string;
  url?: string;
  mimeType: string;
  size: number;
  type: "PHOTO" | "DOCUMENT";
  createdAt: string;
}

export interface AuditLogDTO {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
}

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  roleId: string;
  role?: { id: string; name: string } | null;
  active: boolean;
  createdAt: string;
}

export interface RoleDTO {
  id: string;
  name: RoleName;
  description?: string | null;
  active?: boolean;
  permissions?: string[];
}

export interface DashboardSummary {
  kpis: {
    total: number;
    activos: number;
    buenEstado: number;
    regular: number;
    malo: number;
    enReparacion: number;
    deBaja: number;
    extraviados: number;
  };
  alerts: { sinUbicacion: number; sinResponsable: number; sinSerie: number };
  byStatus: { id: string; name: string; color: string; count: number }[];
  byCategory: { name: string; count: number }[];
  byLocation: { locationId: string; name: string; count: number }[];
  recentMovements: {
    id: string;
    assetCode: string;
    assetName: string;
    type: string;
    fromLocation: string | null;
    toLocation: string | null;
    performedBy: string | null;
    createdAt: string;
  }[];
}

export interface ImportJobDTO {
  id: string;
  filename: string;
  status: "PENDING" | "VALIDATED" | "IMPORTED" | "FAILED";
  totalRows: number;
  validRows: number;
  errorRows: number;
  importedCount?: number;
  errors?: { row: number; message: string }[];
}

export const ROLE_LABELS: Record<RoleName, string> = {
  SUPER_ADMIN: "Super administrador",
  ADMINISTRADOR: "Administrador",
  ENCARGADO_INVENTARIO: "Encargado de inventario",
  DIRECCION: "Dirección",
  FUNCIONARIO: "Funcionario",
  LECTURA: "Solo lectura",
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  TRANSFER: "Traslado",
  STATUS_CHANGE: "Cambio de estado",
  ASSIGNMENT: "Asignación",
  RETURN: "Devolución",
  ADJUSTMENT: "Ajuste",
  DISPATCH: "Despacho",
  RECEIVED: "Recepción",
  MAINTENANCE: "Mantenimiento",
  DISPOSAL: "Baja",
};

export const LOCATION_TYPE_LABELS: Record<string, string> = {
  building: "Edificio",
  cycle: "Ciclo",
  floor: "Piso",
  classroom: "Sala",
  office: "Oficina",
  warehouse: "Bodega",
  library: "Biblioteca",
  laboratory: "Laboratorio",
  gym: "Gimnasio",
  common_area: "Área común",
  other: "Otro",
};
