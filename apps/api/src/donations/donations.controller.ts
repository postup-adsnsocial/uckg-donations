import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createDonationRequestSchema, churchIdSchema } from '@uckg/contracts';
import type { Response } from 'express';

import { CurrentUser } from '../auth/current-user.decorator.js';
import type {
  AuthenticatedAdmin,
  TenantContext as ResolvedTenantContext,
} from '../auth/auth.types.js';
import type { TenantContext } from '../database/tenant-unit-of-work.js';
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js';
import { DomainRoute } from '../tenancy/domain-route.decorator.js';
import { DonationsService, type EnvelopeUpload } from './donations.service.js';

const supportedImageTypes = new Set(['image/jpeg', 'image/png']);

@Controller('donations')
export class DonationsController {
  constructor(
    @Inject(DonationsService) private readonly donations: DonationsService,
  ) {}

  @Get()
  @DomainRoute('donations:read')
  list(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
  ) {
    return this.donations.list(this.toTenantContext(tenant, user));
  }

  @Post()
  @DomainRoute('donations:write')
  create(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
    @Body() body: unknown,
  ) {
    const parsed = createDonationRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException('Invalid envelope data.');
    }

    return this.donations.create(
      this.toTenantContext(tenant, user),
      parsed.data,
    );
  }

  @Post(':donationId/envelope')
  @DomainRoute('donations:write')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8_000_000 } }))
  attachEnvelope(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
    @Param('donationId') donationId: string,
    @UploadedFile() file: EnvelopeUpload | undefined,
  ) {
    const parsedId = churchIdSchema.safeParse(donationId);

    if (!parsedId.success || !file || !supportedImageTypes.has(file.mimetype)) {
      throw new BadRequestException(
        'A JPEG or PNG envelope image up to 8 MB is required.',
      );
    }

    return this.donations.attachEnvelope(
      this.toTenantContext(tenant, user),
      parsedId.data,
      file,
    );
  }

  @Get(':donationId/envelope')
  @DomainRoute('donations:read')
  async getEnvelope(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
    @Param('donationId') donationId: string,
    @Res() response: Response,
  ) {
    const parsedId = churchIdSchema.safeParse(donationId);

    if (!parsedId.success) {
      throw new BadRequestException('Invalid envelope identifier.');
    }

    const file = await this.donations.getEnvelope(
      this.toTenantContext(tenant, user),
      parsedId.data,
    );
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('Cache-Control', 'private, max-age=300');
    response.send(file.buffer);
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
