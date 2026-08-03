import { Controller, Get, UseGuards } from '@nestjs/common';

import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import type { TenantContext } from '../auth/auth.types.js';
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js';
import { PermissionsGuard } from '../tenancy/permissions.guard.js';
import { RequirePermissions } from '../tenancy/permissions.decorator.js';
import { TenantGuard } from '../tenancy/tenant.guard.js';

@Controller('churches/current')
@UseGuards(SessionAuthGuard, TenantGuard, PermissionsGuard)
export class ChurchesController {
  @Get()
  @RequirePermissions('church:read')
  current(@CurrentTenant() tenant: TenantContext) {
    return tenant;
  }

  @Get('settings')
  @RequirePermissions('membership:manage')
  settings(@CurrentTenant() tenant: TenantContext) {
    return {
      church: tenant.church,
      manageable: true,
    };
  }
}
