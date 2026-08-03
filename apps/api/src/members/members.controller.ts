import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { createMemberRequestSchema } from '@uckg/contracts';

import { CurrentUser } from '../auth/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import type {
  AuthenticatedAdmin,
  TenantContext as ResolvedTenantContext,
} from '../auth/auth.types.js';
import type { TenantContext } from '../database/tenant-unit-of-work.js';
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js';
import { PermissionsGuard } from '../tenancy/permissions.guard.js';
import { RequirePermissions } from '../tenancy/permissions.decorator.js';
import { TenantGuard } from '../tenancy/tenant.guard.js';
import { MembersService } from './members.service.js';

@Controller('members')
@UseGuards(SessionAuthGuard, TenantGuard, PermissionsGuard)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @RequirePermissions('members:read')
  list(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
  ) {
    return this.members.list(this.toTenantContext(tenant, user));
  }

  @Post()
  @RequirePermissions('members:write')
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
