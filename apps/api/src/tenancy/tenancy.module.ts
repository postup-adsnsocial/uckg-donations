import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { PermissionsGuard } from './permissions.guard.js';
import { RoutePolicyGuard } from './route-policy.guard.js';
import { TenantGuard } from './tenant.guard.js';
import { TenantService } from './tenant.service.js';

@Module({
  exports: [PermissionsGuard, TenantGuard, TenantService],
  providers: [
    PermissionsGuard,
    TenantGuard,
    TenantService,
    {
      provide: APP_GUARD,
      useClass: RoutePolicyGuard,
    },
  ],
})
export class TenancyModule {}
