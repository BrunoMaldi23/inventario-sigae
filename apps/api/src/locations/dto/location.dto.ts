import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export const LocationTypeValues = {
  building: 'building',
  cycle: 'cycle',
  floor: 'floor',
  classroom: 'classroom',
  office: 'office',
  warehouse: 'warehouse',
  library: 'library',
  laboratory: 'laboratory',
  gym: 'gym',
  common_area: 'common_area',
  other: 'other',
} as const;

export type LocationTypeValue = (typeof LocationTypeValues)[keyof typeof LocationTypeValues];

export class CreateLocationDto {
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  @MaxLength(160)
  name!: string;

  @IsEnum(LocationTypeValues, { message: 'Tipo de ubicación inválido' })
  type!: LocationTypeValue;

  @IsOptional()
  @IsUUID('4', { message: 'Ubicación padre inválida' })
  parentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsEnum(LocationTypeValues)
  type?: LocationTypeValue;

  @IsOptional()
  @IsUUID('4')
  parentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
