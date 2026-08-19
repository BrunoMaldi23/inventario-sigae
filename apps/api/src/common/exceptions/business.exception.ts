import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Excepción de negocio con código de error estable.
 * Formato de salida: { error: { code, message } }
 */
export class BusinessException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(message, status);
  }
}

export function notFound(message: string): BusinessException {
  return new BusinessException('NOT_FOUND', message, HttpStatus.NOT_FOUND);
}

export function forbidden(message: string): BusinessException {
  return new BusinessException('FORBIDDEN', message, HttpStatus.FORBIDDEN);
}

export function unauthorized(message: string): BusinessException {
  return new BusinessException('UNAUTHORIZED', message, HttpStatus.UNAUTHORIZED);
}

export function conflict(message: string): BusinessException {
  return new BusinessException('CONFLICT', message, HttpStatus.CONFLICT);
}

export function invalidData(message: string): BusinessException {
  return new BusinessException('INVALID_DATA', message, HttpStatus.BAD_REQUEST);
}