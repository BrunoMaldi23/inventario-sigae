import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser, PermissionCode } from '@inventario/types';
import { forbidden } from '../exceptions/business.exception';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * RBAC: verifica que el usuario autenticado tenga TODOS los permisos
 * declarados sobre la ruta (a nivel de handler o de controlador).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;

    if (!user) {
      throw forbidden('No autenticado');
    }

    const userPermissions = new Set(user.permissions ?? []);
    const missing = required.filter((p) => !userPermissions.has(p));

    if (missing.length > 0) {
      throw forbidden('No tiene permisos para realizar esta acción');
    }
    return true;
  }
}