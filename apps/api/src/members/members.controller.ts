import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
} from '@nestjs/common';
import { createMemberRequestSchema } from '@uckg/contracts';

import { CurrentUser } from '../auth/current-user.decorator.js';
import type {
  AuthenticatedAdmin,
  TenantContext as ResolvedTenantContext,
} from '../auth/auth.types.js';
import type { TenantContext } from '../database/tenant-unit-of-work.js';
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js';
import { DomainRoute } from '../tenancy/domain-route.decorator.js';
import { MembersService } from './members.service.js';

@Controller('members')
export class MembersController {
  constructor(
    @Inject(MembersService) private readonly members: MembersService,
  ) {}

  @Get()
  @DomainRoute('members:read')
  list(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
  ) {
    return this.members.list(this.toTenantContext(tenant, user));
  }

  @Post()
  @DomainRoute('members:write')
  create(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
    @Body() body: unknown,
  ) {
    const parsed = createMemberRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        issues: parsed.error.issues.map((issue) => ({
          message: issue.message,
          path: issue.path.join('.'),
        })),
        message: 'Invalid member data.',
      });
    }

    return this.members.create(this.toTenantContext(tenant, user), parsed.data);
  }

  private toTenantContext(
    tenant: ResolvedTenantContext,
    user: AuthenticatedAdmin,
  ): TenantContext {
    return {
      actorId: user.id,
      churchId: tenant.church.id,
      correlationId: randomUUID(),
    };
  }
}
