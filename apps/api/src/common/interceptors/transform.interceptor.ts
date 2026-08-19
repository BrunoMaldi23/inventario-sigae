import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@inventario/types';

interface PaginatedPayload {
  items: unknown[];
  meta: Record<string, unknown>;
}

/**
 * Formato consistente de respuesta:
 *   éxito  -> { data, meta }
 *   error  -> { error: { code, message } } (ver AllExceptionsFilter)
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | PaginatedPayload>
{
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    if (!http.getRequest) {
      return next.handle();
    }
    return next.handle().pipe(
      map((payload) => {
        if (
          payload &&
          typeof payload === 'object' &&
          Array.isArray(payload.items) &&
          payload.meta &&
          typeof payload.meta === 'object'
        ) {
          return { data: payload.items, meta: payload.meta };
        }
        if (payload && typeof payload === 'object' && 'data' in payload) {
          return { ...payload, data: (payload as ApiResponse<T>).data };
        }
        return { data: payload };
      }),
    );
  }
}