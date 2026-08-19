import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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