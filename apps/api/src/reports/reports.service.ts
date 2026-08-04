import { randomUUID } from 'node:crypto';

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { schema } from '@uckg/database';
import { and, desc, eq } from 'drizzle-orm';
import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';

import type { TenantContext } from '../database/tenant-unit-of-work.js';
import { TenantUnitOfWork } from '../database/tenant-unit-of-work.js';
import { DonationsService } from '../donations/donations.service.js';
import { PrivateObjectStorage } from '../storage/private-object-storage.js';

export type ReportType = 'detailed' | 'member_totals' | 'payment_methods';
type DonationItem = Awaited<ReturnType<DonationsService['list']>>[number];

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

  async list(context: TenantContext) {
    const reports = await this.tenantUnitOfWork.run(context, (transaction) =>
      transaction
        .select({
          createdAt: schema.reportFiles.createdAt,
          endDate: schema.reportFiles.endDate,
          envelopeCount: schema.reportFiles.envelopeCount,
          id: schema.reportFiles.id,
          reportType: schema.reportFiles.reportType,
          startDate: schema.reportFiles.startDate,
          storageKey: schema.reportFiles.storageKey,
          totalCents: schema.reportFiles.totalCents,
        })
        .from(schema.reportFiles)
        .where(eq(schema.reportFiles.churchId, context.churchId))
        .orderBy(desc(schema.reportFiles.createdAt))
        .limit(20),
    );
    return reports.map(({ storageKey, ...report }) => ({
      ...report,
      includeImages: storageKey.includes('_with-images_')
        ? true
        : storageKey.includes('_without-images_')
          ? false
          : report.reportType === 'detailed',
    }));
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
    reportType: ReportType,
    includeImages: boolean,
  ) {
    const items = await this.donations.list(context, { endDate, startDate });
    const totalCents = items.reduce((sum, item) => sum + item.amountCents, 0);
    const buffer = await this.createPdf(
      context,
      churchName,
      startDate,
      endDate,
      reportType,
      includeImages,
      items,
    );
    const imageLabel = includeImages ? 'with-images' : 'without-images';
    const storageKey = `${context.churchId}/${reportType}_${imageLabel}_${startDate}_${endDate}_${randomUUID()}.pdf`;
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
        reportType,
        startDate,
        storageKey,
        totalCents,
      });
    });

    return {
      buffer,
      filename: `uckg-donations-${reportType}-${imageLabel}-${startDate}-${endDate}.pdf`,
    };
  }

  private async createPdf(
    context: TenantContext,
    churchName: string,
    startDate: string,
    endDate: string,
    reportType: ReportType,
    includeImages: boolean,
    items: DonationItem[],
  ) {
    const document = await PDFDocument.create();
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const total = items.reduce((sum, item) => sum + item.amountCents, 0);
    let page = this.addPage(
      document,
      bold,
      regular,
      churchName,
      startDate,
      endDate,
      total,
    );
    let y = 655;

    if (reportType === 'detailed') {
      for (const item of items) {
        if (y < 135) {
          page = this.addPage(
            document,
            bold,
            regular,
            churchName,
            startDate,
            endDate,
            total,
          );
          y = 655;
        }
        page.drawRectangle({
          x: 42,
          y: y - 82,
          width: 528,
          height: 92,
          color: rgb(0.97, 0.98, 0.99),
          borderColor: rgb(0.87, 0.9, 0.93),
          borderWidth: 1,
        });
        page.drawText(this.clean(item.member?.fullName ?? 'Anonymous'), {
          x: 56,
          y: y - 12,
          font: bold,
          size: 11,
          color: rgb(0.05, 0.12, 0.22),
        });
        page.drawText(
          `${item.receivedOn}  |  ${this.methodLabel(item.paymentMethod)}  |  USD ${(item.amountCents / 100).toFixed(2)}`,
          {
            x: 56,
            y: y - 31,
            font: regular,
            size: 9,
            color: rgb(0.24, 0.31, 0.42),
          },
        );
        page.drawText(`Operator: ${this.clean(item.operatorName)}`, {
          x: 56,
          y: y - 49,
          font: regular,
          size: 8,
          color: rgb(0.38, 0.44, 0.53),
        });
        if (item.notes)
          page.drawText(this.clean(item.notes).slice(0, 62), {
            x: 56,
            y: y - 67,
            font: regular,
            size: 8,
            color: rgb(0.38, 0.44, 0.53),
          });

        y -= 104;
      }
    } else {
      const rows =
        reportType === 'member_totals'
          ? this.memberTotals(items)
          : this.paymentTotals(items);
      page.drawText(
        reportType === 'member_totals'
          ? 'DONATION TOTALS BY MEMBER'
          : 'TOTALS BY PAYMENT METHOD',
        { x: 48, y, font: bold, size: 12, color: rgb(0.02, 0.28, 0.5) },
      );
      y -= 30;
      for (const row of rows) {
        if (y < 70) {
          page = this.addPage(
            document,
            bold,
            regular,
            churchName,
            startDate,
            endDate,
            total,
          );
          y = 655;
        }
        page.drawText(this.clean(row.label).slice(0, 55), {
          x: 52,
          y,
          font: regular,
          size: 10,
          color: rgb(0.05, 0.12, 0.22),
        });
        page.drawText(String(row.count), {
          x: 410,
          y,
          font: regular,
          size: 10,
        });
        page.drawText(`USD ${(row.totalCents / 100).toFixed(2)}`, {
          x: 470,
          y,
          font: bold,
          size: 10,
        });
        page.drawLine({
          start: { x: 48, y: y - 8 },
          end: { x: 565, y: y - 8 },
          thickness: 0.5,
          color: rgb(0.88, 0.9, 0.93),
        });
        y -= 28;
      }
    }

    if (includeImages) {
      await this.appendEnvelopeImages(
        document,
        bold,
        regular,
        context,
        churchName,
        startDate,
        endDate,
        items,
        total,
      );
    }

    return Buffer.from(await document.save());
  }

  private async appendEnvelopeImages(
    document: PDFDocument,
    bold: PDFFont,
    regular: PDFFont,
    context: TenantContext,
    churchName: string,
    startDate: string,
    endDate: string,
    items: DonationItem[],
    totalCents: number,
  ) {
    const itemsWithImages = items.filter((item) => item.envelope);
    let page = this.addPage(
      document,
      bold,
      regular,
      churchName,
      startDate,
      endDate,
      totalCents,
    );
    page.drawText('ENVELOPE IMAGES', {
      x: 48,
      y: 650,
      font: bold,
      size: 12,
      color: rgb(0.02, 0.28, 0.5),
    });
    let y = 610;

    if (!itemsWithImages.length) {
      page.drawText('No envelope images in this period.', {
        x: 48,
        y,
        font: regular,
        size: 10,
        color: rgb(0.38, 0.44, 0.53),
      });
      return;
    }

    for (const item of itemsWithImages) {
      if (y < 290) {
        page = this.addPage(
          document,
          bold,
          regular,
          churchName,
          startDate,
          endDate,
          totalCents,
        );
        page.drawText('ENVELOPE IMAGES', {
          x: 48,
          y: 650,
          font: bold,
          size: 12,
          color: rgb(0.02, 0.28, 0.5),
        });
        y = 610;
      }

      page.drawText(
        this.clean(
          `${item.receivedOn} | ${item.member?.fullName ?? 'Anonymous'} | USD ${(item.amountCents / 100).toFixed(2)}`,
        ).slice(0, 82),
        {
          x: 52,
          y,
          font: bold,
          size: 9,
          color: rgb(0.05, 0.12, 0.22),
        },
      );

      try {
        const file = await this.donations.getEnvelope(context, item.id);
        const image =
          file.contentType === 'image/png'
            ? await document.embedPng(file.buffer)
            : await document.embedJpg(file.buffer);
        const dimensions = image.scaleToFit(490, 235);
        page.drawImage(image, {
          x: 52 + (490 - dimensions.width) / 2,
          y: y - 253,
          width: dimensions.width,
          height: dimensions.height,
        });
      } catch {
        page.drawText('Image unavailable', {
          x: 52,
          y: y - 34,
          font: regular,
          size: 9,
          color: rgb(0.55, 0.25, 0.25),
        });
      }
      y -= 285;
    }
  }

  private addPage(
    document: PDFDocument,
    bold: PDFFont,
    regular: PDFFont,
    churchName: string,
    startDate: string,
    endDate: string,
    totalCents: number,
  ): PDFPage {
    const page = document.addPage([612, 792]);
    page.drawRectangle({
      x: 0,
      y: 720,
      width: 612,
      height: 72,
      color: rgb(0.01, 0.19, 0.32),
    });
    page.drawText('UNIVERSAL  |  DONATIONS REPORT', {
      x: 44,
      y: 758,
      font: bold,
      size: 15,
      color: rgb(1, 1, 1),
    });
    page.drawText(this.clean(churchName), {
      x: 44,
      y: 737,
      font: regular,
      size: 10,
      color: rgb(0.78, 0.88, 0.94),
    });
    page.drawText(`${startDate} to ${endDate}`, {
      x: 44,
      y: 690,
      font: bold,
      size: 11,
      color: rgb(0.05, 0.12, 0.22),
    });
    page.drawText(`USD ${(totalCents / 100).toFixed(2)}`, {
      x: 470,
      y: 690,
      font: bold,
      size: 11,
      color: rgb(0.02, 0.36, 0.61),
    });
    return page;
  }

  private memberTotals(items: DonationItem[]) {
    const totals = new Map<string, { count: number; totalCents: number }>();
    for (const item of items) {
      const label = item.member?.fullName ?? 'Anonymous';
      const current = totals.get(label) ?? { count: 0, totalCents: 0 };
      current.count += 1;
      current.totalCents += item.amountCents;
      totals.set(label, current);
    }
    return [...totals.entries()]
      .map(([label, value]) => ({ label, ...value }))
      .sort((a, b) => b.totalCents - a.totalCents);
  }

  private paymentTotals(items: DonationItem[]) {
    return (['cash', 'card', 'check'] as const).map((method) => {
      const filtered = items.filter((item) => item.paymentMethod === method);
      return {
        count: filtered.length,
        label: this.methodLabel(method),
        totalCents: filtered.reduce((sum, item) => sum + item.amountCents, 0),
      };
    });
  }

  private methodLabel(method: DonationItem['paymentMethod']) {
    return { card: 'Card', cash: 'Cash', check: 'Check' }[method];
  }

  private clean(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7e]/g, '?');
  }
}
