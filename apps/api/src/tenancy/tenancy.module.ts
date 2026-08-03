import { Module } from '@nestjs/common';

import { PermissionsGuard } from './permissions.guard.js';
import { TenantGuard } from './tenant.guard.js';
import { TenantService } from './tenant.service.js';

@Module({
  exports: [PermissionsGuard, TenantGuard, TenantService],
  providers: [PermissionsGuard, TenantGuard, TenantService],
})
export class TenancyModule {}
