import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { churchIdSchema } from '@uckg/contracts';
import type { Response } from 'express';

import { CurrentUser } from '../auth/current-user.decorator.js';
import type {
  AuthenticatedAdmin,
  TenantContext as ResolvedTenantContext,
} from '../auth/auth.types.js';
import type { TenantContext } from '../database/tenant-unit-of-work.js';
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js';
import { DomainRoute } from '../tenancy/domain-route.decorator.js';
import { ReportsService, type ReportType } from './reports.service.js';

@Controller('reports')
export class ReportsController {
  constructor(
    @Inject(ReportsService) private readonly reports: ReportsService,
  ) {}

  @Get()
  @DomainRoute('donations:read')
  list(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
  ) {
    return this.reports.list(this.context(tenant, user));
  }

  @Get('pdf')
  @DomainRoute('donations:read')
  async pdf(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('reportType') reportTypeValue: string,
    @Res() response: Response,
  ) {
    const reportType = reportTypeValue as ReportType;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
      startDate > endDate ||
      !['detailed', 'member_totals', 'payment_methods'].includes(reportType)
    )
      throw new BadRequestException('Invalid report period.');
    const report = await this.reports.generate(
      this.context(tenant, user),
      tenant.church.name,
      startDate,
      endDate,
      reportType,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${report.filename}"`,
    );
    response.send(report.buffer);
  }

  @Get(':reportId')
  @DomainRoute('donations:read')
  async get(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
    @Param('reportId') reportId: string,
    @Res() response: Response,
  ) {
    const parsedId = churchIdSchema.safeParse(reportId);
    if (!parsedId.success)
      throw new BadRequestException('Invalid report identifier.');
    const report = await this.reports.get(
      this.context(tenant, user),
      parsedId.data,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${report.filename}"`,
    );
    response.send(report.buffer);
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
