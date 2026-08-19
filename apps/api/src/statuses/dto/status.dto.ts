import { IsBoolean, IsHexadecimal, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStatusDto {
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsHexadecimal({ message: 'Color inválido' })
  @MaxLength(6)
  color?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateStatusDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsHexadecimal({ message: 'Color inválido' })
  @MaxLength(6)
  color?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}