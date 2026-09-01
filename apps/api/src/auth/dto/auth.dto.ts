import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@escuela.cl' })
  @IsEmail({}, { message: 'Correo inválido' })
  email!: string;

  @ApiProperty({ example: '********' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString({ message: 'Token de refresco inválido' })
  refreshToken!: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Administradora Principal' })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres' })
  name?: string;

  @ApiPropertyOptional({ example: 'admin@escuela.cl' })
  @IsOptional()
  @IsEmail({}, { message: 'Correo inválido' })
  @MaxLength(180, { message: 'El correo no puede superar 180 caracteres' })
  email?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: '********' })
  @IsString({ message: 'La contraseña actual es obligatoria' })
  currentPassword!: string;

  @ApiProperty({ example: '********' })
  @IsString({ message: 'La nueva contraseña es obligatoria' })
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  newPassword!: string;
}
