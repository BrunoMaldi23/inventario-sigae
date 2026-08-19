import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @IsEmail({}, { message: 'Correo inválido' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;

  @IsString()
  name!: string;

  @IsUUID('4', { message: 'Rol inválido' })
  roleId!: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Correo inválido' })
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Rol inválido' })
  roleId?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  active?: boolean;
}