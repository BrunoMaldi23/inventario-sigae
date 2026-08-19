import { z } from 'zod';
import type { AssetMovementType } from '@inventario/types';

/**
 * Esquemas de validación compartidos (Zod).
 * Se reutilizan en formularios Web y Móvil y sirven de contrato
 * espejo de los DTOs del backend (class-validator).
 */

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export const loginSchema = z.object({
  email: z.string().email('Ingrese un correo válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/* ------------------------------------------------------------------ */
/* Bien                                                                */
/* ------------------------------------------------------------------ */

export const assetSchema = z.object({
  assetCode: z.string().trim().min(1, 'El código es obligatorio'),
  name: z.string().trim().min(1, 'La denominación es obligatoria'),
  description: z.string().trim().max(500).optional().nullable(),
  brand: z.string().trim().max(120).optional().nullable(),
  model: z.string().trim().max(120).optional().nullable(),
  serialNumber: z.string().trim().max(200).optional().nullable(),
  categoryId: z.string().uuid('Categoría inválida').optional().nullable(),
  statusId: z.string().uuid('Estado inválido'),
  locationId: z.string().uuid('Ubicación inválida').optional().nullable(),
  responsibleId: z.string().uuid('Responsable inválido').optional().nullable(),
  acquisitionDate: z.string().optional().nullable(),
  acquisitionValue: z.number().nonnegative().optional().nullable(),
  supplier: z.string().trim().max(200).optional().nullable(),
  invoiceNumber: z.string().trim().max(120).optional().nullable(),
  purchaseOrder: z.string().trim().max(120).optional().nullable(),
  fundingSource: z.string().trim().max(200).optional().nullable(),
  provenance: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  active: z.boolean().optional().default(true),
});

export type AssetInput = z.infer<typeof assetSchema>;

export const assetCreateSchema = assetSchema.partial({ assetCode: true });

export type AssetCreateInput = z.infer<typeof assetCreateSchema>;

/* ------------------------------------------------------------------ */
/* Movimiento                                                          */
/* ------------------------------------------------------------------ */

const movementTypeValues = [
  'TRANSFER',
  'ASSIGNMENT',
  'RETURN',
  'LOAN',
  'REPAIR',
  'MAINTENANCE',
  'STORAGE',
  'DISPOSAL',
  'STATUS_CHANGE',
  'OTHER',
] as const satisfies readonly AssetMovementType[];

export const transferSchema = z
  .object({
    type: z.enum(movementTypeValues).default('TRANSFER'),
    toLocationId: z.string().uuid('Ubicación destino inválida'),
    toResponsibleId: z.string().uuid().optional().nullable(),
    reason: z.string().trim().min(1, 'El motivo es obligatorio'),
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .refine((v) => v.toLocationId, { message: 'Seleccione una ubicación de destino' });

export type TransferInput = z.infer<typeof transferSchema>;

export const changeStatusSchema = z.object({
  type: z.literal('STATUS_CHANGE').optional().default('STATUS_CHANGE'),
  toStatusId: z.string().uuid('Estado inválido'),
  toLocationId: z.string().uuid().optional().nullable(),
  reason: z.string().trim().min(1, 'El motivo es obligatorio'),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;

export const movementSchema = z.object({
  type: z.enum(movementTypeValues),
  fromLocationId: z.string().uuid().optional().nullable(),
  toLocationId: z.string().uuid().optional().nullable(),
  fromResponsibleId: z.string().uuid().optional().nullable(),
  toResponsibleId: z.string().uuid().optional().nullable(),
  fromStatusId: z.string().uuid().optional().nullable(),
  toStatusId: z.string().uuid().optional().nullable(),
  reason: z.string().trim().min(1, 'El motivo es obligatorio'),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type MovementInput = z.infer<typeof movementSchema>;

/* ------------------------------------------------------------------ */
/* Ubicación                                                           */
/* ------------------------------------------------------------------ */

export const locationSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  type: z.enum([
    'building',
    'floor',
    'classroom',
    'office',
    'warehouse',
    'library',
    'laboratory',
    'gym',
    'common_area',
    'other',
  ]),
  parentId: z.string().uuid().optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  active: z.boolean().optional().default(true),
});

export type LocationInput = z.infer<typeof locationSchema>;

/* ------------------------------------------------------------------ */
/* Categoría / Estado / Responsable                                    */
/* ------------------------------------------------------------------ */

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  parentId: z.string().uuid().optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  active: z.boolean().optional().default(true),
});

export const statusSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido (formato #RRGGBB)')
    .optional()
    .default('#6b7280'),
  sortOrder: z.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
});

export const responsibleSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  email: z.string().email().optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  role: z.string().trim().max(200).optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  active: z.boolean().optional().default(true),
});