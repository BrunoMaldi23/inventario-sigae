import { SetMetadata } from '@nestjs/common';
import { PermissionCode } from '@inventario/types';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);