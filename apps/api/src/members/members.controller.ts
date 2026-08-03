import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { churchIdSchema, createMemberRequestSchema } from '@uckg/contracts';

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
    @Query('search') search?: string,
    @Query('page') pageValue?: string,
    @Query('status') statusValue?: string,
    @Query('pageSize') pageSizeValue?: string,
  ) {
    const status =
      statusValue === 'active' || statusValue === 'inactive'
        ? statusValue
        : undefined;
    const page = Math.max(1, Number.parseInt(pageValue ?? '1', 10) || 1);
    const pageSize = Math.min(
      200,
      Math.max(1, Number.parseInt(pageSizeValue ?? '20', 10) || 20),
    );
    return this.members.list(
      this.toTenantContext(tenant, user),
      search?.slice(0, 160),
      page,
      status,
      pageSize,
    );
  }

  @Get(':id')
  @DomainRoute('members:read')
  get(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
    @Param('id') id: string,
  ) {
    return this.members.get(
      this.toTenantContext(tenant, user),
      this.parseId(id),
    );
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

  @Patch(':id')
  @DomainRoute('members:write')
  update(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
    @Param('id') id: string,
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
    return this.members.update(
      this.toTenantContext(tenant, user),
      this.parseId(id),
      parsed.data,
    );
  }

  private parseId(id: string) {
    const parsed = churchIdSchema.safeParse(id);
    if (!parsed.success) throw new BadRequestException('Invalid member id.');
    return parsed.data;
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
