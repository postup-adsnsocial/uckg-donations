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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  createDonationRequestSchema,
  churchIdSchema,
  updateDonationRequestSchema,
} from '@uckg/contracts';
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
import { isSupportedEnvelopeImage } from './envelope-upload.js';

const maximumEnvelopeImageBytes = 4_000_000;

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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('memberId') memberId?: string,
  ) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (
      (startDate && !datePattern.test(startDate)) ||
      (endDate && !datePattern.test(endDate)) ||
      (memberId && !churchIdSchema.safeParse(memberId).success)
    ) {
      throw new BadRequestException('Invalid envelope filters.');
    }

    return this.donations.list(this.toTenantContext(tenant, user), {
      endDate,
      memberId,
      startDate,
    });
  }

  @Get(':donationId')
  @DomainRoute('donations:read')
  get(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
    @Param('donationId') donationId: string,
  ) {
    const parsedId = churchIdSchema.safeParse(donationId);

    if (!parsedId.success) {
      throw new BadRequestException('Invalid envelope identifier.');
    }

    return this.donations.get(
      this.toTenantContext(tenant, user),
      parsedId.data,
    );
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

  @Patch(':donationId')
  @DomainRoute('donations:write')
  update(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
    @Param('donationId') donationId: string,
    @Body() body: unknown,
  ) {
    const parsedId = churchIdSchema.safeParse(donationId);
    const parsed = updateDonationRequestSchema.safeParse(body);

    if (!parsedId.success || !parsed.success) {
      throw new BadRequestException('Invalid envelope data.');
    }

    return this.donations.update(
      this.toTenantContext(tenant, user),
      parsedId.data,
      parsed.data,
    );
  }

  @Post(':donationId/envelope')
  @DomainRoute('donations:write')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: maximumEnvelopeImageBytes },
    }),
  )
  attachEnvelope(
    @CurrentTenant() tenant: ResolvedTenantContext,
    @CurrentUser() user: AuthenticatedAdmin,
    @Param('donationId') donationId: string,
    @UploadedFile() file: EnvelopeUpload | undefined,
  ) {
    const parsedId = churchIdSchema.safeParse(donationId);

    if (!parsedId.success || !file || !isSupportedEnvelopeImage(file)) {
      throw new BadRequestException(
        'A JPEG or PNG envelope image up to 4 MB is required.',
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
    response.setHeader('Cache-Control', 'private, no-store, max-age=0');
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
