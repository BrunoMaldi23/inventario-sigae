import { SetMetadata } from '@nestjs/common';

/** Marca una ruta como pública (sin autenticación). */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);