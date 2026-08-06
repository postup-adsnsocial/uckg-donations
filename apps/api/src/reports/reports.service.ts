import { randomUUID } from 'node:crypto';

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { schema } from '@uckg/database';
import { and, desc, eq } from 'drizzle-orm';
import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib';

import type { TenantContext } from '../database/tenant-unit-of-work.js';
import { TenantUnitOfWork } from '../database/tenant-unit-of-work.js';
import { DonationsService } from '../donations/donations.service.js';
import { PrivateObjectStorage } from '../storage/private-object-storage.js';

export type ReportType =
  | 'annual_members'
  | 'detailed'
  | 'member_totals'
  | 'payment_methods';
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
    return reports.map(({ storageKey, ...report }) => {
      const reportType = storageKey.includes('/annual_members_')
        ? 'annual_members'
        : report.reportType;
      return {
        ...report,
        reportType,
        includeImages: storageKey.includes('_with-images_')
          ? true
          : storageKey.includes('_without-images_')
            ? false
            : reportType === 'detailed',
      };
    });
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
    const signedUrl = await this.storage.createSignedDownloadUrl(
      this.storageBucket,
      report.storageKey,
    );
    return {
      buffer: signedUrl
        ? null
        : await this.storage.download(this.storageBucket, report.storageKey),
      filename: `uckg-donations-${report.startDate}-${report.endDate}.pdf`,
      signedUrl,
    };
  }

  async generate(
    context: TenantContext,
    churchName: string,
    startDate: string,
    endDate: string,
    reportType: ReportType,
    includeImages: boolean,
    memberId?: string,
  ) {
    const effectiveIncludeImages =
      reportType === 'annual_members' ? false : includeImages;
    const items = await this.donations.list(context, {
      endDate,
      memberId,
      startDate,
    });
    const totalCents = items.reduce((sum, item) => sum + item.amountCents, 0);
    const buffer = await this.createPdf(
      context,
      churchName,
      startDate,
      endDate,
      reportType,
      effectiveIncludeImages,
      items,
    );
    const imageLabel = effectiveIncludeImages
      ? 'with-images'
      : 'without-images';
    const storedReportType =
      reportType === 'annual_members' ? 'member_totals' : reportType;
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
        reportType: storedReportType,
        startDate,
        storageKey,
        totalCents,
      });
    });

    return {
      buffer,
      filename: `uckg-donations-${reportType}-${imageLabel}-${startDate}-${endDate}.pdf`,
      signedUrl: await this.storage.createSignedDownloadUrl(
        this.storageBucket,
        storageKey,
      ),
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
    const logo = await this.loadUniversalLogo(document);
    const total = items.reduce((sum, item) => sum + item.amountCents, 0);
    if (reportType === 'annual_members') {
      return this.createAnnualMembersPdf(
        document,
        bold,
        regular,
        churchName,
        startDate,
        endDate,
        items,
        logo,
        total,
      );
    }
    let page = this.addPage(
      document,
      bold,
      regular,
      churchName,
      startDate,
      endDate,
      logo,
      total,
    );
    let y = 655;

    if (reportType === 'detailed') {
      for (const item of items) {
        const cardHeight = includeImages ? (item.envelope ? 280 : 110) : 92;
        if (y - cardHeight < 70) {
          page = this.addPage(
            document,
            bold,
            regular,
            churchName,
            startDate,
            endDate,
            logo,
            total,
          );
          y = 655;
        }
        page.drawRectangle({
          x: 42,
          y: y - cardHeight + 10,
          width: 528,
          height: cardHeight,
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
          `${this.formatDate(item.receivedOn)}  |  ${this.methodLabel(item.paymentMethod)}  |  USD ${(item.amountCents / 100).toFixed(2)}`,
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

        if (includeImages) {
          if (item.envelope) {
            await this.drawEnvelopeImage(
              document,
              page,
              regular,
              context,
              item,
              y,
            );
          } else {
            page.drawText('No envelope image', {
              x: 56,
              y: y - 88,
              font: regular,
              size: 8,
              color: rgb(0.5, 0.55, 0.62),
            });
          }
        }

        y -= cardHeight + 12;
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
            logo,
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

    if (includeImages && reportType !== 'detailed') {
      await this.appendEnvelopeImages(
        document,
        bold,
        regular,
        context,
        churchName,
        startDate,
        endDate,
        items,
        logo,
        total,
      );
    }

    return Buffer.from(await document.save());
  }

  private async createAnnualMembersPdf(
    document: PDFDocument,
    bold: PDFFont,
    regular: PDFFont,
    churchName: string,
    startDate: string,
    endDate: string,
    items: DonationItem[],
    logo: PDFImage | null,
    totalCents: number,
  ) {
    const rows = this.annualMemberTotals(items);
    const monthLabels = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ];
    const startX = 24;
    const nameWidth = 150;
    const monthWidth = 43;
    const totalWidth = 76;
    const tableWidth = nameWidth + monthWidth * 12 + totalWidth;

    const addAnnualPage = () => {
      const page = document.addPage([792, 612]);
      page.drawRectangle({
        x: 0,
        y: 540,
        width: 792,
        height: 72,
        color: rgb(0.01, 0.19, 0.32),
      });
      this.drawUniversalLogo(page, logo, 742, 558, 30);
      page.drawText('UNIVERSAL  |  ANNUAL DONOR REPORT', {
        x: 28,
        y: 578,
        font: bold,
        size: 15,
        color: rgb(1, 1, 1),
      });
      page.drawText(this.clean(churchName), {
        x: 28,
        y: 557,
        font: regular,
        size: 10,
        color: rgb(0.78, 0.88, 0.94),
      });
      page.drawText(
        `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`,
        {
          x: 28,
          y: 520,
          font: bold,
          size: 9,
          color: rgb(0.05, 0.12, 0.22),
        },
      );
      page.drawText(`USD ${(totalCents / 100).toFixed(2)}`, {
        x: 688,
        y: 520,
        font: bold,
        size: 9,
        color: rgb(0.02, 0.36, 0.61),
      });
      page.drawRectangle({
        x: startX,
        y: 484,
        width: tableWidth,
        height: 24,
        color: rgb(0.9, 0.95, 0.98),
      });
      page.drawText('DONOR', {
        x: startX + 6,
        y: 492,
        font: bold,
        size: 7,
        color: rgb(0.02, 0.28, 0.5),
      });
      monthLabels.forEach((label, index) => {
        page.drawText(label, {
          x: startX + nameWidth + index * monthWidth + 13,
          y: 492,
          font: bold,
          size: 6.5,
          color: rgb(0.02, 0.28, 0.5),
        });
      });
      page.drawText('TOTAL', {
        x: startX + nameWidth + monthWidth * 12 + 22,
        y: 492,
        font: bold,
        size: 7,
        color: rgb(0.02, 0.28, 0.5),
      });
      return page;
    };

    let page = addAnnualPage();
    let y = 466;
    const monthlyGrandTotals = Array.from({ length: 12 }, () => 0);
    rows.forEach((row) =>
      row.months.forEach((amount, month) => {
        monthlyGrandTotals[month] = (monthlyGrandTotals[month] ?? 0) + amount;
      }),
    );
    const displayRows = [
      ...rows.map((row) => ({ ...row, totalRow: false })),
      {
        label: 'TOTAL',
        months: monthlyGrandTotals,
        totalCents,
        totalRow: true,
      },
    ];

    displayRows.forEach((row, index) => {
      if (y < 34) {
        page = addAnnualPage();
        y = 466;
      }
      if (row.totalRow || index % 2 === 0) {
        page.drawRectangle({
          x: startX,
          y: y - 7,
          width: tableWidth,
          height: 21,
          color: row.totalRow ? rgb(0.88, 0.94, 0.97) : rgb(0.98, 0.985, 0.99),
        });
      }
      const rowFont = row.totalRow ? bold : regular;
      page.drawText(this.clean(row.label).slice(0, 29), {
        x: startX + 6,
        y,
        font: rowFont,
        size: 7.2,
        color: rgb(0.05, 0.12, 0.22),
      });
      row.months.forEach((amount, month) => {
        const text = this.compactAmount(amount);
        const textWidth = rowFont.widthOfTextAtSize(text, 6.3);
        page.drawText(text, {
          x:
            startX +
            nameWidth +
            month * monthWidth +
            monthWidth -
            textWidth -
            4,
          y,
          font: rowFont,
          size: 6.3,
          color: rgb(0.05, 0.12, 0.22),
        });
      });
      const totalText = this.compactAmount(row.totalCents);
      const totalTextWidth = rowFont.widthOfTextAtSize(totalText, 6.7);
      page.drawText(totalText, {
        x: startX + tableWidth - totalTextWidth - 6,
        y,
        font: rowFont,
        size: 6.7,
        color: row.totalRow ? rgb(0.02, 0.28, 0.5) : rgb(0.05, 0.12, 0.22),
      });
      page.drawLine({
        start: { x: startX, y: y - 7 },
        end: { x: startX + tableWidth, y: y - 7 },
        thickness: 0.35,
        color: rgb(0.86, 0.89, 0.92),
      });
      y -= 21;
    });

    return Buffer.from(await document.save());
  }

  private async drawEnvelopeImage(
    document: PDFDocument,
    page: PDFPage,
    regular: PDFFont,
    context: TenantContext,
    item: DonationItem,
    y: number,
  ) {
    const imageArea = { height: 180, width: 500, x: 56, y: y - 260 };
    page.drawRectangle({
      ...imageArea,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.87, 0.9, 0.93),
      borderWidth: 1,
    });

    try {
      const file = await this.donations.getEnvelope(context, item.id);
      const image =
        file.contentType === 'image/png'
          ? await document.embedPng(file.buffer)
          : await document.embedJpg(file.buffer);
      const dimensions = image.scaleToFit(
        imageArea.width - 12,
        imageArea.height - 12,
      );
      page.drawImage(image, {
        x: imageArea.x + (imageArea.width - dimensions.width) / 2,
        y: imageArea.y + (imageArea.height - dimensions.height) / 2,
        width: dimensions.width,
        height: dimensions.height,
      });
    } catch {
      page.drawText('Image unavailable', {
        x: imageArea.x + 12,
        y: imageArea.y + imageArea.height - 24,
        font: regular,
        size: 9,
        color: rgb(0.55, 0.25, 0.25),
      });
    }
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
    logo: PDFImage | null,
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
      logo,
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
          logo,
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
          `${this.formatDate(item.receivedOn)} | ${item.member?.fullName ?? 'Anonymous'} | USD ${(item.amountCents / 100).toFixed(2)}`,
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
    logo: PDFImage | null,
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
    this.drawUniversalLogo(page, logo, 558, 738, 30);
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
    page.drawText(
      `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`,
      {
        x: 44,
        y: 690,
        font: bold,
        size: 11,
        color: rgb(0.05, 0.12, 0.22),
      },
    );
    page.drawText(`USD ${(totalCents / 100).toFixed(2)}`, {
      x: 470,
      y: 690,
      font: bold,
      size: 11,
      color: rgb(0.02, 0.36, 0.61),
    });
    return page;
  }

  private async loadUniversalLogo(document: PDFDocument) {
    try {
      const response = await fetch(
        process.env.UNIVERSAL_LOGO_URL ??
          'https://uckg-donations-web.vercel.app/universal-logo.png',
        { signal: AbortSignal.timeout(3000) },
      );
      if (!response.ok) return null;
      return await document.embedPng(await response.arrayBuffer());
    } catch {
      return null;
    }
  }

  private drawUniversalLogo(
    page: PDFPage,
    logo: PDFImage | null,
    x: number,
    y: number,
    size: number,
  ) {
    if (!logo) return;
    const dimensions = logo.scaleToFit(size, size);
    page.drawImage(logo, {
      x: x + (size - dimensions.width) / 2,
      y: y + (size - dimensions.height) / 2,
      width: dimensions.width,
      height: dimensions.height,
    });
  }

  private formatDate(date: string) {
    const [year, month, day] = date.split('-');
    return year && month && day ? `${month}/${day}/${year}` : date;
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

  private annualMemberTotals(items: DonationItem[]) {
    const totals = new Map<
      string,
      { label: string; months: number[]; totalCents: number }
    >();
    for (const item of items) {
      const key = item.member?.id ?? 'anonymous';
      const current = totals.get(key) ?? {
        label: item.member?.fullName ?? 'Anonymous',
        months: Array.from({ length: 12 }, () => 0),
        totalCents: 0,
      };
      const month = Number(item.receivedOn.slice(5, 7)) - 1;
      if (month >= 0 && month < 12)
        current.months[month] = (current.months[month] ?? 0) + item.amountCents;
      current.totalCents += item.amountCents;
      totals.set(key, current);
    }
    return [...totals.values()].sort((a, b) => a.label.localeCompare(b.label));
  }

  private compactAmount(amountCents: number) {
    if (!amountCents) return '-';
    const amount = amountCents / 100;
    return Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2);
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
