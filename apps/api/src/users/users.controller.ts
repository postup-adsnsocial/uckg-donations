import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  churchIdSchema,
  createAdminUserRequestSchema,
  updateAdminUserRequestSchema,
} from '@uckg/contracts';

import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedAdmin, TenantContext } from '../auth/auth.types.js';
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js';
import { DomainRoute } from '../tenancy/domain-route.decorator.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get()
  @DomainRoute('membership:manage')
  list(@CurrentTenant() tenant: TenantContext) {
    return this.users.list(tenant.church.id);
  }

  @Post()
  @DomainRoute('membership:manage')
  create(@CurrentTenant() tenant: TenantContext, @Body() body: unknown) {
    const parsed = createAdminUserRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid user data.');
    }
    return this.users.create(tenant.church.id, parsed.data);
  }

  @Patch(':id')
  @DomainRoute('membership:manage')
  update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const userId = churchIdSchema.safeParse(id);
    const input = updateAdminUserRequestSchema.safeParse(body);
    if (!userId.success || !input.success) {
      throw new BadRequestException('Invalid user data.');
    }
    return this.users.update(
      tenant.church.id,
      user.id,
      userId.data,
      input.data,
    );
  }
}
