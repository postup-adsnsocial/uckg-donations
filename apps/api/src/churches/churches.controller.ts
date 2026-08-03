import { Controller, Get } from '@nestjs/common';

import type { TenantContext } from '../auth/auth.types.js';
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js';
import { DomainRoute } from '../tenancy/domain-route.decorator.js';

@Controller('churches/current')
export class ChurchesController {
  @Get()
  @DomainRoute('church:read')
  current(@CurrentTenant() tenant: TenantContext) {
    return tenant;
  }

  @Get('settings')
  @DomainRoute('membership:manage')
  settings(@CurrentTenant() tenant: TenantContext) {
    return {
      church: tenant.church,
      manageable: true,
    };
  }
}
