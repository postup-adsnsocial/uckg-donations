import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { createChurchRequestSchema } from '@uckg/contracts';

import { CurrentUser } from '../auth/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import type { AuthenticatedAdmin, TenantContext } from '../auth/auth.types.js';
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js';
import { DomainRoute } from '../tenancy/domain-route.decorator.js';
import { IdentityRoute } from '../tenancy/route-policy.decorator.js';
import { ChurchesService } from './churches.service.js';

@Controller('churches')
export class ChurchesController {
  constructor(
    @Inject(ChurchesService) private readonly churches: ChurchesService,
  ) {}

  @Get()
  @IdentityRoute()
  @UseGuards(SessionAuthGuard)
  list(@CurrentUser() user: AuthenticatedAdmin) {
    this.assertPlatformAdmin(user);
    return this.churches.list();
  }

  @Post()
  @IdentityRoute()
  @UseGuards(SessionAuthGuard)
  create(@CurrentUser() user: AuthenticatedAdmin, @Body() body: unknown) {
    this.assertPlatformAdmin(user);
    const parsed = createChurchRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException('A valid church name is required.');
    }

    return this.churches.create(parsed.data);
  }

  @Get('current')
  @DomainRoute('church:read')
  current(@CurrentTenant() tenant: TenantContext) {
    return tenant;
  }

  @Get('current/settings')
  @DomainRoute('membership:manage')
  settings(@CurrentTenant() tenant: TenantContext) {
    return {
      church: tenant.church,
      manageable: true,
    };
  }

  private assertPlatformAdmin(user: AuthenticatedAdmin): void {
    if (!user.isPlatformAdmin) {
      throw new ForbiddenException(
        'Platform administrator access is required.',
      );
    }
  }
}
