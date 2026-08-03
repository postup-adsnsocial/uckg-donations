import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission, type ChurchPermission } from '@uckg/authorization';

import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { requiredPermissionsKey } from './permissions.decorator.js';

export const churchPermissions: ReadonlySet<ChurchPermission> = new Set([
  'audit:read',
  'church:read',
  'finance:write',
  'members:read',
  'members:write',
  'membership:manage',
]);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissions = this.reflector.getAllAndOverride<ChurchPermission[]>(
      requiredPermissionsKey,
      [context.getHandler(), context.getClass()],
    );

    if (
      !permissions?.length ||
      permissions.some((permission) => !churchPermissions.has(permission))
    ) {
      throw new ForbiddenException(
        'A known route permission is required for domain authorization.',
      );
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.authUser || !request.tenant) {
      throw new ForbiddenException('Tenant authorization context is missing.');
    }

    const allowed = permissions.every((permission) =>
      hasPermission(
        {
          isPlatformAdmin: request.authUser!.isPlatformAdmin,
          role: request.tenant!.role,
        },
        permission,
      ),
    );

    if (!allowed) {
      throw new ForbiddenException(
        'The current role does not grant this permission.',
      );
    }

    return true;
  }
}
