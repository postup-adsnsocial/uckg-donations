import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { saveAnnualBookDayRequestSchema } from '@uckg/contracts';

import { CurrentUser } from '../auth/current-user.decorator.js';
import type {
  AuthenticatedAdmin,
  TenantContext as ResolvedTenantContext,
} from '../auth/auth.types.js';
import type { TenantContext } from '../database/tenant-unit-of-work.js';
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js';
import { DomainRoute } from '../tenancy/domain-route.decorator.js';
import { parseIsoDate } from './annual-book-calculations.js';
import { AnnualBookService } from './annual-book.service.js';

@Controller('annual-book')
export class AnnualBookController {
  constructor(
    @Inject(AnnualBookService)
    private readonly annualBook: AnnualBookService,
  ) {}

  @Get()
  @DomainRoute('finance:read')
  month(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
    @Query('month') month: string,
  ) {
    const year = Number(month?.slice(0, 4));
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || year < 1900 || year > 2100) {
      throw new BadRequestException('Invalid annual book month.');
    }
    return this.annualBook.month(this.context(tenant, user), month);
  }

  @Get('summary')
  @DomainRoute('finance:read')
  summary(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    this.assertPeriod(startDate, endDate);
    return this.annualBook.summary(this.context(tenant, user), {
      endDate,
      startDate,
    });
  }

  @Get('comparison')
  @DomainRoute('finance:read')
  comparison(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
    @Query('startA') startA: string,
    @Query('endA') endA: string,
    @Query('startB') startB: string,
    @Query('endB') endB: string,
  ) {
    this.assertPeriod(startA, endA);
    this.assertPeriod(startB, endB);
    return this.annualBook.comparison(
      this.context(tenant, user),
      { endDate: endA, startDate: startA },
      { endDate: endB, startDate: startB },
    );
  }

  @Put('days/:entryDate')
  @DomainRoute('finance:write')
  saveDay(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
    @Param('entryDate') entryDate: string,
    @Body() body: unknown,
  ) {
    const parsed = saveAnnualBookDayRequestSchema.safeParse(body);
    if (
      !parseIsoDate(entryDate) ||
      !parsed.success ||
      parsed.data.entryDate !== entryDate
    ) {
      throw new BadRequestException('Invalid annual book day.');
    }
    return this.annualBook.saveDay(this.context(tenant, user), parsed.data);
  }

  private assertPeriod(startDate: string, endDate: string) {
    const start = parseIsoDate(startDate);
    const end = parseIsoDate(endDate);
    if (!start || !end || startDate > endDate) {
      throw new BadRequestException('Invalid annual book period.');
    }
  }

  private context(
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
