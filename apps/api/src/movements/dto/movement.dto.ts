import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { MovementTypeValues } from '../../assets/dto/asset.dto';

export class QueryMovementsDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page = 1;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  pageSize = 50;

  @IsOptional()
  @IsEnum(MovementTypeValues)
  type?: string;

  @IsOptional()
  @IsUUID('4')
  assetId?: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}