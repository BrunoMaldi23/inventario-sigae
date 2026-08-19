import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const MovementTypeValues = {
  TRANSFER: 'TRANSFER',
  ASSIGNMENT: 'ASSIGNMENT',
  RETURN: 'RETURN',
  LOAN: 'LOAN',
  REPAIR: 'REPAIR',
  MAINTENANCE: 'MAINTENANCE',
  STORAGE: 'STORAGE',
  DISPOSAL: 'DISPOSAL',
  STATUS_CHANGE: 'STATUS_CHANGE',
  OTHER: 'OTHER',
} as const;

export type MovementTypeValue = (typeof MovementTypeValues)[keyof typeof MovementTypeValues];

export class QueryAssetsDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page = 1;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  pageSize = 50;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsUUID('4')
  statusId?: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @IsOptional()
  @IsUUID('4')
  responsibleId?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasSerial?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasPhoto?: boolean;

  @IsOptional()
  @IsDateString()
  updatedFrom?: string;

  @IsOptional()
  @IsDateString()
  updatedTo?: string;

  @IsOptional()
  @IsString()
  orderBy?: 'assetCode' | 'name' | 'brand' | 'model' | 'updatedAt' | 'createdAt';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';
}

export class CreateAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  assetCode?: string;

  @IsString()
  @MinLength(1, { message: 'La denominación es obligatoria' })
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  serialNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  barcode?: string;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsUUID('4')
  statusId!: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @IsOptional()
  @IsUUID('4')
  responsibleId?: string;

  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  acquisitionValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  purchaseOrder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fundingSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  provenance?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  assetCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  serialNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  barcode?: string;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsUUID('4')
  statusId?: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @IsOptional()
  @IsUUID('4')
  responsibleId?: string;

  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  acquisitionValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  purchaseOrder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fundingSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  provenance?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @IsPositive()
  version?: number;
}

export class TransferAssetDto {
  @IsEnum(MovementTypeValues)
  @IsOptional()
  type?: MovementTypeValue;

  @IsUUID('4', { message: 'Ubicación destino inválida' })
  toLocationId!: string;

  @IsOptional()
  @IsUUID('4')
  toResponsibleId?: string;

  @IsString()
  @MinLength(1, { message: 'El motivo es obligatorio' })
  @MaxLength(200)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  version?: number;
}

export class ChangeStatusDto {
  @IsOptional()
  @IsEnum(MovementTypeValues)
  type?: MovementTypeValue;

  @IsUUID('4', { message: 'Estado inválido' })
  toStatusId!: string;

  @IsOptional()
  @IsUUID('4')
  toLocationId?: string;

  @IsOptional()
  @IsUUID('4')
  toResponsibleId?: string;

  @IsString()
  @MinLength(1, { message: 'El motivo es obligatorio' })
  @MaxLength(200)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  version?: number;
}

export class BulkTransferDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  assetIds!: string[];

  @IsUUID('4')
  toLocationId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class BulkStatusDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  assetIds!: string[];

  @IsUUID('4')
  toStatusId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}