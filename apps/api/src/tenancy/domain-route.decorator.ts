import { applyDecorators, UseGuards } from '@nestjs/common';
import type { ChurchPermission } from '@uckg/authorization';

import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { PermissionsGuard } from './permissions.guard.js';
import { RequirePermissions } from './permissions.decorator.js';
import { DomainRoutePolicy } from './route-policy.decorator.js';
import { TenantGuard } from './tenant.guard.js';

export function DomainRoute(
  firstPermission: ChurchPermission,
  ...rest: ChurchPermission[]
) {
  return applyDecorators(
    DomainRoutePolicy(),
    RequirePermissions(firstPermission, ...rest),
    UseGuards(SessionAuthGuard, TenantGuard, PermissionsGuard),
  );
}
