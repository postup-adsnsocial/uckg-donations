import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { schema } from '@uckg/database';
import { and, desc, eq } from 'drizzle-orm';

import type { TenantContext } from '../database/tenant-unit-of-work.js';
import { TenantUnitOfWork } from '../database/tenant-unit-of-work.js';
import { DonationsService } from '../donations/donations.service.js';
import { PrivateObjectStorage } from '../storage/private-object-storage.js';

@Injectable()
export class ReportsService {
  private readonly storageBucket =
    process.env.REPORT_STORAGE_BUCKET ?? 'reports';

  constructor(
    @Inject(DonationsService) private readonly donations: DonationsService,
    @Inject(TenantUnitOfWork)
    private readonly tenantUnitOfWork: TenantUnitOfWork,
    @Inject(PrivateObjectStorage)
    private readonly storage: PrivateObjectStorage,
  ) {}

  list(context: TenantContext) {
    return this.tenantUnitOfWork.run(context, (transaction) =>
      transaction
        .select({
          createdAt: schema.reportFiles.createdAt,
          endDate: schema.reportFiles.endDate,
          envelopeCount: schema.reportFiles.envelopeCount,
          id: schema.reportFiles.id,
          startDate: schema.reportFiles.startDate,
          totalCents: schema.reportFiles.totalCents,
        })
        .from(schema.reportFiles)
        .where(eq(schema.reportFiles.churchId, context.churchId))
        .orderBy(desc(schema.reportFiles.createdAt))
        .limit(20),
    );
  }

  async get(context: TenantContext, reportId: string) {
    const report = await this.tenantUnitOfWork.run(
      context,
      async (transaction) => {
        const [found] = await transaction
          .select({
            endDate: schema.reportFiles.endDate,
            startDate: schema.reportFiles.startDate,
            storageKey: schema.reportFiles.storageKey,
          })
          .from(schema.reportFiles)
          .where(
            and(
              eq(schema.reportFiles.churchId, context.churchId),
              eq(schema.reportFiles.id, reportId),
            ),
          )
          .limit(1);
        return found;
      },
    );

    if (!report) throw new NotFoundException('Report not found.');
    return {
      buffer: await this.storage.download(
        this.storageBucket,
        report.storageKey,
      ),
      filename: `uckg-donations-${report.startDate}-${report.endDate}.pdf`,
    };
  }

  async generate(
    context: TenantContext,
    churchName: string,
    startDate: string,
    endDate: string,
  ) {
    const items = await this.donations.list(context, { endDate, startDate });
    const totalCents = items.reduce((sum, item) => sum + item.amountCents, 0);
    const buffer = this.createPdf(churchName, startDate, endDate, items);
    const storageKey = `${context.churchId}/${startDate}_${endDate}_${randomUUID()}.pdf`;
    await this.storage.upload(
      this.storageBucket,
      storageKey,
      buffer,
      'application/pdf',
    );

    await this.tenantUnitOfWork.run(context, async (transaction) => {
      await transaction.insert(schema.reportFiles).values({
        churchId: context.churchId,
        createdBy: context.actorId,
        endDate,
        envelopeCount: items.length,
        startDate,
        storageKey,
        totalCents,
      });
    });

    return { buffer, filename: `uckg-donations-${startDate}-${endDate}.pdf` };
  }

  private createPdf(
    churchName: string,
    startDate: string,
    endDate: string,
    items: Awaited<ReturnType<DonationsService['list']>>,
  ) {
    const plain = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7e]/g, '?')
        .replace(/[()\\]/g, '\\$&');
    const total = items.reduce((sum, item) => sum + item.amountCents, 0);
    const lines = [
      'UCKG DONATIONS - REPORT',
      plain(churchName),
      `${startDate} to ${endDate}`,
      `Envelopes: ${items.length}    Total: USD ${(total / 100).toFixed(2)}`,
      '',
      'Date         Member                                  Amount',
      ...items.slice(0, 30).map(
        (item) =>
          `${item.receivedOn}   ${plain(item.member?.fullName ?? 'Anonymous')
            .slice(0, 34)
            .padEnd(34)} USD ${(item.amountCents / 100).toFixed(2)}`,
      ),
    ];
    const stream = lines
      .map(
        (line, index) =>
          `BT /F1 ${index < 2 ? 16 : 10} Tf 48 ${760 - index * 20} Td (${line}) Tj ET`,
      )
      .join('\n');
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(Buffer.byteLength(pdf));
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xref = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, '0')} 00000 n `)
      .join(
        '\n',
      )}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf, 'ascii');
  }
}
