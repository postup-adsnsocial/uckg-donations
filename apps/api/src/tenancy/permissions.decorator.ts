import { SetMetadata } from '@nestjs/common';
import type { ChurchPermission } from '@uckg/authorization';

export const requiredPermissionsKey = 'required-church-permissions';

export const RequirePermissions = (...permissions: ChurchPermission[]) =>
  SetMetadata(requiredPermissionsKey, permissions);
