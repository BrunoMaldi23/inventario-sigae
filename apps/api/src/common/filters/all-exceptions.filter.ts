import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

const HTTP_ERROR_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const body: ErrorBody = { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' };
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      body.code = exception.code;
      body.message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        body.message = res;
      } else if (res && typeof res === 'object') {
        const r = res as Record<string, unknown>;
        if (typeof r.message === 'string') {
          body.message = r.message;
        } else if (Array.isArray(r.message)) {
          // Mensajes de validación de class-validator
          body.message = 'Error de validación';
          body.details = r.message;
        }
        if (typeof r.error === 'string') {
          body.code = r.error.toUpperCase().replace(/\s+/g, '_');
        }
      }
      if (exception.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        body.code = 'TOO_MANY_REQUESTS';
      }
      if (!body.details && body.code === 'BAD_REQUEST') {
        body.code = HTTP_ERROR_CODES[status] ?? 'HTTP_ERROR';
      }
    } else if ((exception as { code?: string })?.code === 'P2002') {
      status = HttpStatus.CONFLICT;
      body.code = 'CONFLICT';
      body.message = 'Registro duplicado: ya existe un recurso con los mismos datos únicos.';
      this.logger.warn(`Prisma P2002 en ${request.method} ${request.url}`);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      body.code = exception.code;
      body.message = 'Error de base de datos';
      body.details = exception.meta;
      this.logger.error(
        `Prisma ${exception.code} en ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
    } else if ((exception as { name?: string })?.name === 'PrismaClientKnownRequestError') {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      body.code = (exception as { code?: string }).code ?? 'DATABASE_ERROR';
      body.message = 'Error de base de datos';
    }

    if (status >= 500) {
      if (exception instanceof Error) {
        this.logger.error(
          `${request.method} ${request.url} -> ${exception.message}`,
          exception.stack,
        );
      } else {
        this.logger.error(`${request.method} ${request.url} -> excepción desconocida`);
      }
    }

    response.status(status).json({ error: body });
  }
}
