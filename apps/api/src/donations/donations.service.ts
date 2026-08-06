import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateDonationRequest } from '@uckg/contracts';
import { schema } from '@uckg/database';
import { and, desc, eq, gte, lte, type SQL } from 'drizzle-orm';

import {
  type TenantContext,
  TenantUnitOfWork,
} from '../database/tenant-unit-of-work.js';
import { PrivateObjectStorage } from '../storage/private-object-storage.js';

export interface EnvelopeUpload {
  readonly buffer: Buffer;
  readonly mimetype: string;
  readonly originalname: string;
  readonly size: number;
}

@Injectable()
export class DonationsService {
  private readonly storageBucket =
    process.env.ENVELOPE_STORAGE_BUCKET ?? 'envelopes';

  constructor(
    @Inject(TenantUnitOfWork)
    private readonly tenantUnitOfWork: TenantUnitOfWork,
    @Inject(PrivateObjectStorage)
    private readonly storage: PrivateObjectStorage,
  ) {}

  list(
    context: TenantContext,
    filters: { startDate?: string; endDate?: string; memberId?: string } = {},
  ) {
    const predicates: SQL[] = [eq(schema.donations.churchId, context.churchId)];

    if (filters.startDate) {
      predicates.push(gte(schema.donations.receivedOn, filters.startDate));
    }

    if (filters.endDate) {
      predicates.push(lte(schema.donations.receivedOn, filters.endDate));
    }

    if (filters.memberId) {
      predicates.push(eq(schema.donations.memberId, filters.memberId));
    }

    return this.tenantUnitOfWork.run(context, (transaction) =>
      transaction
        .select({
          amountCents: schema.donations.amountCents,
          createdAt: schema.donations.createdAt,
          envelopeContentType: schema.envelopeFiles.contentType,
          envelopeOriginalName: schema.envelopeFiles.originalName,
          envelopeSizeBytes: schema.envelopeFiles.sizeBytes,
          id: schema.donations.id,
          memberFullName: schema.members.fullName,
          memberId: schema.members.id,
          notes: schema.donations.notes,
          operatorName: schema.adminUsers.displayName,
          paymentMethod: schema.donations.paymentMethod,
          receivedOn: schema.donations.receivedOn,
        })
        .from(schema.donations)
        .leftJoin(
          schema.members,
          and(
            eq(schema.members.churchId, schema.donations.churchId),
            eq(schema.members.id, schema.donations.memberId),
          ),
        )
        .leftJoin(
          schema.envelopeFiles,
          and(
            eq(schema.envelopeFiles.churchId, schema.donations.churchId),
            eq(schema.envelopeFiles.donationId, schema.donations.id),
          ),
        )
        .innerJoin(
          schema.adminUsers,
          eq(schema.adminUsers.id, schema.donations.createdBy),
        )
        .where(and(...predicates))
        .orderBy(
          desc(schema.donations.receivedOn),
          desc(schema.donations.createdAt),
        )
        .then((rows) =>
          rows.map((row) => ({
            amountCents: row.amountCents,
            createdAt: row.createdAt,
            envelope: row.envelopeOriginalName
              ? {
                  contentType: row.envelopeContentType!,
                  originalName: row.envelopeOriginalName,
                  sizeBytes: row.envelopeSizeBytes!,
                }
              : null,
            id: row.id,
            member: row.memberId
              ? { fullName: row.memberFullName!, id: row.memberId }
              : null,
            notes: row.notes,
            operatorName: row.operatorName,
            paymentMethod: row.paymentMethod,
            receivedOn: row.receivedOn,
          })),
        ),
    );
  }

  async get(context: TenantContext, donationId: string) {
    const donations = await this.list(context);
    const donation = donations.find((item) => item.id === donationId);

    if (!donation) {
      throw new NotFoundException(
        'Envelope record not found in the active church.',
      );
    }

    return donation;
  }

  async create(context: TenantContext, input: CreateDonationRequest) {
    return this.tenantUnitOfWork.run(context, async (transaction) => {
      if (input.memberId) {
        const [member] = await transaction
          .select({ id: schema.members.id })
          .from(schema.members)
          .where(
            and(
              eq(schema.members.churchId, context.churchId),
              eq(schema.members.id, input.memberId),
            ),
          )
          .limit(1);

        if (!member) {
          throw new NotFoundException('Member not found in the active church.');
        }
      }

      const [donation] = await transaction
        .insert(schema.donations)
        .values({
          amountCents: input.amountCents,
          churchId: context.churchId,
          createdBy: context.actorId,
          memberId: input.memberId ?? null,
          notes: input.notes ?? null,
          paymentMethod: input.paymentMethod,
          receivedOn: input.receivedOn,
        })
        .returning({ id: schema.donations.id });

      if (!donation) {
        throw new Error('The envelope record could not be created.');
      }

      return donation;
    });
  }

  async attachEnvelope(
    context: TenantContext,
    donationId: string,
    file: EnvelopeUpload,
  ) {
    const extension = this.safeExtension(file.originalname, file.mimetype);
    const storageKey = `${context.churchId}/${donationId}-${randomUUID()}${extension}`;
    await this.storage.upload(
      this.storageBucket,
      storageKey,
      file.buffer,
      file.mimetype,
    );

    try {
      return await this.tenantUnitOfWork.run(context, async (transaction) => {
        const [donation] = await transaction
          .select({ id: schema.donations.id })
          .from(schema.donations)
          .where(
            and(
              eq(schema.donations.churchId, context.churchId),
              eq(schema.donations.id, donationId),
            ),
          )
          .limit(1);

        if (!donation) {
          throw new NotFoundException(
            'Envelope record not found in the active church.',
          );
        }

        const [attachment] = await transaction
          .insert(schema.envelopeFiles)
          .values({
            checksum: createHash('sha256').update(file.buffer).digest('hex'),
            churchId: context.churchId,
            contentType: file.mimetype,
            donationId,
            originalName: file.originalname.slice(0, 255),
            sizeBytes: file.size,
            storageKey,
            uploadedBy: context.actorId,
          })
          .onConflictDoUpdate({
            set: {
              checksum: createHash('sha256').update(file.buffer).digest('hex'),
              contentType: file.mimetype,
              originalName: file.originalname.slice(0, 255),
              sizeBytes: file.size,
              storageKey,
              uploadedBy: context.actorId,
            },
            target: [
              schema.envelopeFiles.churchId,
              schema.envelopeFiles.donationId,
            ],
          })
          .returning({ id: schema.envelopeFiles.id });

        return attachment;
      });
    } catch (error) {
      await this.storage.remove(this.storageBucket, storageKey);
      throw error;
    }
  }

  async getEnvelope(context: TenantContext, donationId: string) {
    const file = await this.findEnvelope(context, donationId);

    return {
      buffer: await this.storage.download(this.storageBucket, file.storageKey),
      contentType: file.contentType,
      originalName: file.originalName,
    };
  }

  async getEnvelopeUrl(context: TenantContext, donationId: string) {
    const file = await this.findEnvelope(context, donationId);
    return this.storage.createSignedDownloadUrl(
      this.storageBucket,
      file.storageKey,
    );
  }

  private async findEnvelope(context: TenantContext, donationId: string) {
    const file = await this.tenantUnitOfWork.run(
      context,
      async (transaction) => {
        const [found] = await transaction
          .select({
            contentType: schema.envelopeFiles.contentType,
            originalName: schema.envelopeFiles.originalName,
            storageKey: schema.envelopeFiles.storageKey,
          })
          .from(schema.envelopeFiles)
          .where(
            and(
              eq(schema.envelopeFiles.churchId, context.churchId),
              eq(schema.envelopeFiles.donationId, donationId),
            ),
          )
          .limit(1);

        return found;
      },
    );

    if (!file) {
      throw new NotFoundException('Envelope image not found.');
    }

    return file;
  }

  private safeExtension(originalName: string, contentType: string): string {
    const expected = contentType === 'image/png' ? '.png' : '.jpg';
    const received = extname(originalName).toLowerCase();
    return received === '.jpeg' || received === '.jpg' || received === '.png'
      ? received
      : expected;
  }
}
