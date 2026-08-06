import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { churchIdSchema, createChurchRequestSchema } from '@uckg/contracts';

import { CurrentUser } from '../auth/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import type { AuthenticatedAdmin, TenantContext } from '../auth/auth.types.js';
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js';
import { DomainRoute } from '../tenancy/domain-route.decorator.js';
import { IdentityRoute } from '../tenancy/route-policy.decorator.js';
import { TenantService } from '../tenancy/tenant.service.js';
import { ChurchesService } from './churches.service.js';

@Controller('churches')
export class ChurchesController {
  constructor(
    @Inject(ChurchesService) private readonly churches: ChurchesService,
    @Inject(TenantService) private readonly tenants: TenantService,
  ) {}

  @Get()
  @IdentityRoute()
  @UseGuards(SessionAuthGuard)
  async list(
    @CurrentUser() user: AuthenticatedAdmin,
    @Headers('x-church-id') churchId?: string,
  ) {
    if (user.isPlatformAdmin) return this.churches.list();
    const tenant = await this.requireChurchAdmin(user, churchId);
    return this.churches.listById(tenant.church.id);
  }

  @Post()
  @IdentityRoute()
  @UseGuards(SessionAuthGuard)
  async create(
    @CurrentUser() user: AuthenticatedAdmin,
    @Headers('x-church-id') churchId: string | undefined,
    @Body() body: unknown,
  ) {
    const parsed = createChurchRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException('A valid church name is required.');
    }

    if (user.isPlatformAdmin) return this.churches.create(parsed.data);
    await this.requireChurchAdmin(user, churchId);
    return this.churches.create(parsed.data, user.id);
  }

  @Patch(':id')
  @IdentityRoute()
  @UseGuards(SessionAuthGuard)
  async update(
    @CurrentUser() user: AuthenticatedAdmin,
    @Headers('x-church-id') churchId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = createChurchRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException('A valid church name is required.');
    }

    const parsedId = this.parseId(id);
    if (!user.isPlatformAdmin) {
      await this.requireChurchAdmin(user, churchId, parsedId);
    }
    return this.churches.update(parsedId, parsed.data);
  }

  @Delete(':id')
  @IdentityRoute()
  @UseGuards(SessionAuthGuard)
  delete(@CurrentUser() user: AuthenticatedAdmin, @Param('id') id: string) {
    this.assertPlatformAdmin(user);
    return this.churches.delete(this.parseId(id));
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

  private async requireChurchAdmin(
    user: AuthenticatedAdmin,
    churchId: string | undefined,
    targetChurchId?: string,
  ) {
    const tenant = await this.tenants.resolve(user, churchId ?? '');
    if (!tenant || tenant.role !== 'church_admin') {
      throw new ForbiddenException('Church administrator access is required.');
    }
    if (targetChurchId && tenant.church.id !== targetChurchId) {
      throw new ForbiddenException(
        'A church administrator can only manage the current church.',
      );
    }
    return tenant;
  }

  private parseId(id: string): string {
    const parsed = churchIdSchema.safeParse(id);

    if (!parsed.success) {
      throw new BadRequestException('A valid church id is required.');
    }

    return parsed.data;
  }
}
