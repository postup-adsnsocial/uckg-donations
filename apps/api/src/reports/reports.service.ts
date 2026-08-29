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
import { AnnualBookService } from '../annual-book/annual-book.service.js';
import { PrivateObjectStorage } from '../storage/private-object-storage.js';

export type ReportType =
  | 'annual_book'
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
    @Inject(AnnualBookService)
    private readonly annualBook: AnnualBookService,
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
      reportType === 'annual_members' || reportType === 'annual_book'
        ? false
        : includeImages;
    let envelopeCount: number;
    let totalCents: number;
    let buffer: Buffer;

    if (reportType === 'annual_book') {
      const summary = await this.annualBook.summary(context, {
        endDate,
        startDate,
      });
      envelopeCount = summary.dayCount;
      totalCents = summary.metrics.totalWithAthCents;
      buffer = await this.createAnnualBookPdf(
        churchName,
        startDate,
        endDate,
        summary.metrics,
      );
    } else {
      const items = await this.donations.list(context, {
        endDate,
        memberId,
        startDate,
      });
      envelopeCount = items.length;
      totalCents = items.reduce((sum, item) => sum + item.amountCents, 0);
      buffer = await this.createPdf(
        context,
        churchName,
        startDate,
        endDate,
        reportType,
        effectiveIncludeImages,
        items,
      );
    }
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
        envelopeCount,
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

  private async createAnnualBookPdf(
    churchName: string,
    startDate: string,
    endDate: string,
    metrics: Awaited<ReturnType<AnnualBookService['summary']>>['metrics'],
  ) {
    const document = await PDFDocument.create();
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const logo = await this.loadUniversalLogo(document);
    const page = document.addPage([612, 792]);
    page.drawRectangle({
      x: 0,
      y: 742,
      width: 612,
      height: 50,
      color: rgb(1, 1, 1),
    });
    this.drawUniversalLogo(page, logo, 44, 750, 250, 32);
    page.drawRectangle({
      x: 0,
      y: 682,
      width: 612,
      height: 60,
      color: rgb(0.01, 0.19, 0.32),
    });
    page.drawText('ANNUAL BOOK REPORT', {
      x: 44,
      y: 710,
      font: bold,
      size: 15,
      color: rgb(1, 1, 1),
    });
    page.drawText(this.clean(churchName), {
      x: 44,
      y: 692,
      font: regular,
      size: 10,
      color: rgb(0.78, 0.88, 0.94),
    });
    page.drawText(
      `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`,
      {
        x: 44,
        y: 656,
        font: bold,
        size: 11,
        color: rgb(0.05, 0.12, 0.22),
      },
    );

    const rows = [
      ['Cash', metrics.cashCents],
      ['Checks', metrics.checkCents],
      ['Cards recorded', metrics.cardCents],
      ['Card machine', metrics.cardMachineCents],
      ['Card difference', metrics.cardDifferenceCents],
      ['ATH Movil', metrics.athMobileCents],
      ['Designated envelopes', metrics.designatedEnvelopeCents],
      ['UNDESIGNATED', metrics.undesignatedCents],
      ['Expected deposits', metrics.expectedDepositCents],
      ['Total without ATH Movil', metrics.totalWithoutAthCents],
      ['Total with ATH Movil', metrics.totalWithAthCents],
    ] as const;
    let y = 610;
    rows.forEach(([label, value], index) => {
      if (index % 2 === 0) {
        page.drawRectangle({
          x: 44,
          y: y - 9,
          width: 524,
          height: 30,
          color: rgb(0.97, 0.98, 0.99),
        });
      }
      page.drawText(label, {
        x: 56,
        y,
        font: label === 'UNDESIGNATED' ? bold : regular,
        size: 10,
        color:
          label === 'UNDESIGNATED'
            ? rgb(0.02, 0.28, 0.5)
            : rgb(0.05, 0.12, 0.22),
      });
      page.drawText(
        value === null ? 'Not informed' : `USD ${(value / 100).toFixed(2)}`,
        {
          x: 430,
          y,
          font: label === 'UNDESIGNATED' ? bold : regular,
          size: 10,
          color: rgb(0.05, 0.12, 0.22),
        },
      );
      y -= 32;
    });
    return Buffer.from(await document.save());
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

    if (reportType === 'detailed' && includeImages) {
      return this.createContributorReceiptsPdf(
        document,
        bold,
        regular,
        context,
        churchName,
        startDate,
        endDate,
        items,
        logo,
      );
    }

    if (reportType === 'member_totals') {
      return this.createContributorSummaryPdf(
        document,
        bold,
        regular,
        churchName,
        startDate,
        endDate,
        items,
        logo,
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
    let y = 625;

    if (reportType === 'detailed') {
      for (const item of items) {
        const cardHeight = includeImages ? (item.envelope ? 280 : 128) : 110;
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
          y = 625;
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
        page.drawText(`Church: ${this.clean(churchName)}`, {
          x: 56,
          y: y - 49,
          font: regular,
          size: 8,
          color: rgb(0.38, 0.44, 0.53),
        });
        page.drawText(`Operator: ${this.clean(item.operatorName)}`, {
          x: 56,
          y: y - 67,
          font: regular,
          size: 8,
          color: rgb(0.38, 0.44, 0.53),
        });
        if (item.notes)
          page.drawText(this.clean(item.notes).slice(0, 62), {
            x: 56,
            y: y - 85,
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
      const rows = this.paymentTotals(items);
      page.drawText('TOTALS BY PAYMENT METHOD', {
        x: 48,
        y,
        font: bold,
        size: 12,
        color: rgb(0.02, 0.28, 0.5),
      });
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
          y = 625;
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

  private async createContributorSummaryPdf(
    document: PDFDocument,
    bold: PDFFont,
    regular: PDFFont,
    churchName: string,
    startDate: string,
    endDate: string,
    items: DonationItem[],
    logo: PDFImage | null,
  ) {
    const rows = this.memberTotals(items);
    const totalCents = items.reduce((sum, item) => sum + item.amountCents, 0);
    const startX = 44;
    const churchColumnWidth = 104;
    const amountColumnWidth = 142;
    const contributorColumnWidth = 278;
    const tableWidth =
      churchColumnWidth + amountColumnWidth + contributorColumnWidth;

    const addSummaryPage = () => {
      const page = document.addPage([612, 792]);
      this.drawUniversalLogo(page, logo, 44, 738, 230, 32);
      page.drawLine({
        start: { x: startX, y: 722 },
        end: { x: startX + tableWidth, y: 722 },
        thickness: 1.3,
        color: rgb(0.04, 0.04, 0.04),
      });
      const title = 'CONTRIBUTOR SUMMARY';
      const titleWidth = bold.widthOfTextAtSize(title, 15);
      page.drawText(title, {
        x: (612 - titleWidth) / 2,
        y: 698,
        font: bold,
        size: 15,
        color: rgb(0.04, 0.04, 0.04),
      });
      const period = `For Period ${this.formatDate(startDate)} to ${this.formatDate(endDate)}`;
      const periodWidth = regular.widthOfTextAtSize(period, 10);
      page.drawText(period, {
        x: (612 - periodWidth) / 2,
        y: 666,
        font: regular,
        size: 10,
        color: rgb(0.05, 0.05, 0.05),
      });

      const headerY = 642;
      const drawCenteredHeader = (label: string, x: number, width: number) => {
        const labelWidth = bold.widthOfTextAtSize(label, 10);
        page.drawText(label, {
          x: x + (width - labelWidth) / 2,
          y: headerY,
          font: bold,
          size: 10,
          color: rgb(0.04, 0.04, 0.04),
        });
      };
      drawCenteredHeader('Church', startX, churchColumnWidth);
      drawCenteredHeader(
        'Amount',
        startX + churchColumnWidth,
        amountColumnWidth,
      );
      drawCenteredHeader(
        'Contributor',
        startX + churchColumnWidth + amountColumnWidth,
        contributorColumnWidth,
      );
      page.drawLine({
        start: { x: startX, y: 636 },
        end: { x: startX + tableWidth, y: 636 },
        thickness: 1,
        color: rgb(0.04, 0.04, 0.04),
      });
      return page;
    };

    let page = addSummaryPage();
    let y = 618;

    for (const row of rows) {
      if (y < 72) {
        page = addSummaryPage();
        y = 618;
      }
      page.drawText(this.clean(churchName).slice(0, 16), {
        x: startX + 8,
        y,
        font: regular,
        size: 9.5,
        color: rgb(0.05, 0.05, 0.05),
      });
      const amount = `USD ${(row.totalCents / 100).toFixed(2)}`;
      const amountWidth = regular.widthOfTextAtSize(amount, 9.5);
      page.drawText(amount, {
        x: startX + churchColumnWidth + amountColumnWidth - amountWidth - 10,
        y,
        font: regular,
        size: 9.5,
        color: rgb(0.05, 0.05, 0.05),
      });
      page.drawText(this.clean(row.label).slice(0, 40), {
        x: startX + churchColumnWidth + amountColumnWidth + 10,
        y,
        font: regular,
        size: 9.5,
        color: rgb(0.05, 0.05, 0.05),
      });
      y -= 18;
    }

    page.drawLine({
      start: { x: startX, y: y + 4 },
      end: { x: startX + tableWidth, y: y + 4 },
      thickness: 1,
      color: rgb(0.04, 0.04, 0.04),
    });
    page.drawText('TOTAL', {
      x: startX + 20,
      y: y - 16,
      font: bold,
      size: 13,
      color: rgb(0.04, 0.04, 0.04),
    });
    const total = `USD ${(totalCents / 100).toFixed(2)}`;
    const totalWidth = bold.widthOfTextAtSize(total, 11);
    page.drawText(total, {
      x: startX + churchColumnWidth + amountColumnWidth - totalWidth - 10,
      y: y - 15,
      font: bold,
      size: 11,
      color: rgb(0.04, 0.04, 0.04),
    });

    return Buffer.from(await document.save());
  }

  private async createContributorReceiptsPdf(
    document: PDFDocument,
    bold: PDFFont,
    regular: PDFFont,
    context: TenantContext,
    churchName: string,
    startDate: string,
    endDate: string,
    items: DonationItem[],
    logo: PDFImage | null,
  ) {
    const contributors = new Map<
      string,
      { items: DonationItem[]; member: DonationItem['member'] }
    >();

    for (const item of items) {
      const key = item.member?.id ?? 'anonymous';
      const contributor = contributors.get(key) ?? {
        items: [],
        member: item.member,
      };
      contributor.items.push(item);
      contributors.set(key, contributor);
    }

    const contributorEntries = [...contributors.values()].sort((left, right) =>
      (left.member?.fullName ?? 'Anonymous').localeCompare(
        right.member?.fullName ?? 'Anonymous',
      ),
    );

    if (!contributorEntries.length) {
      this.addContributorReceiptPage(
        document,
        bold,
        regular,
        churchName,
        startDate,
        endDate,
        logo,
        null,
        0,
      );
      return Buffer.from(await document.save());
    }

    for (const contributor of contributorEntries) {
      const contributorTotal = contributor.items.reduce(
        (sum, item) => sum + item.amountCents,
        0,
      );
      let page = this.addContributorReceiptPage(
        document,
        bold,
        regular,
        churchName,
        startDate,
        endDate,
        logo,
        contributor.member,
        contributorTotal,
      );
      let y = 590;

      for (const item of contributor.items) {
        const entryHeight = 202;
        if (y - entryHeight < 38) {
          page = this.addContributorReceiptPage(
            document,
            bold,
            regular,
            churchName,
            startDate,
            endDate,
            logo,
            contributor.member,
            contributorTotal,
          );
          y = 590;
        }

        page.drawText('DATE:', {
          x: 48,
          y: y - 18,
          font: regular,
          size: 9,
          color: rgb(0.05, 0.12, 0.22),
        });
        page.drawText(this.formatDate(item.receivedOn), {
          x: 88,
          y: y - 18,
          font: bold,
          size: 8.5,
          color: rgb(0.05, 0.12, 0.22),
        });
        page.drawText('AMOUNT:', {
          x: 48,
          y: y - 39,
          font: regular,
          size: 9,
          color: rgb(0.05, 0.12, 0.22),
        });
        page.drawText(`USD ${(item.amountCents / 100).toFixed(2)}`, {
          x: 48,
          y: y - 54,
          font: bold,
          size: 8.5,
          color: rgb(0.05, 0.12, 0.22),
        });
        page.drawText('TYPE:', {
          x: 48,
          y: y - 77,
          font: regular,
          size: 9,
          color: rgb(0.05, 0.12, 0.22),
        });
        page.drawText(this.methodLabel(item.paymentMethod), {
          x: 48,
          y: y - 92,
          font: bold,
          size: 8.5,
          color: rgb(0.05, 0.12, 0.22),
        });

        const messageArea = { height: 174, width: 360, x: 196, y: y - 184 };
        page.drawRectangle({
          ...messageArea,
          color: rgb(1, 1, 1),
          borderColor: rgb(0.08, 0.12, 0.16),
          borderWidth: 0.8,
        });

        if (item.envelope) {
          try {
            const file = await this.donations.getEnvelope(context, item.id);
            const image =
              file.contentType === 'image/png'
                ? await document.embedPng(file.buffer)
                : await document.embedJpg(file.buffer);
            const dimensions = image.scaleToFit(
              messageArea.width - 12,
              messageArea.height - 12,
            );
            page.drawImage(image, {
              x: messageArea.x + (messageArea.width - dimensions.width) / 2,
              y: messageArea.y + (messageArea.height - dimensions.height) / 2,
              width: dimensions.width,
              height: dimensions.height,
            });
          } catch {
            page.drawText('Message image unavailable', {
              x: messageArea.x + 12,
              y: messageArea.y + messageArea.height - 20,
              font: regular,
              size: 8,
              color: rgb(0.55, 0.25, 0.25),
            });
          }
        }

        y -= entryHeight;
      }
    }

    return Buffer.from(await document.save());
  }

  private addContributorReceiptPage(
    document: PDFDocument,
    bold: PDFFont,
    regular: PDFFont,
    churchName: string,
    startDate: string,
    endDate: string,
    logo: PDFImage | null,
    member: DonationItem['member'],
    totalCents: number,
  ) {
    const page = document.addPage([612, 792]);
    this.drawUniversalLogo(page, logo, 44, 738, 230, 32);

    const title = `Receipts by Contributor - ${this.formatDate(startDate)} to ${this.formatDate(endDate)}`;
    const titleWidth = bold.widthOfTextAtSize(title, 10);
    page.drawText(title, {
      x: Math.max(44, (612 - titleWidth) / 2),
      y: 706,
      font: bold,
      size: 10,
      color: rgb(0.05, 0.05, 0.05),
    });

    const contributorName = this.clean(member?.fullName ?? 'Anonymous');
    page.drawText('NAME:', {
      x: 48,
      y: 672,
      font: bold,
      size: 9,
      color: rgb(0.05, 0.05, 0.05),
    });
    page.drawText(contributorName.slice(0, 54), {
      x: 84,
      y: 672,
      font: regular,
      size: 9,
      color: rgb(0.05, 0.05, 0.05),
    });
    page.drawText(this.receiptAddress(member, churchName).slice(0, 78), {
      x: 48,
      y: 652,
      font: regular,
      size: 8.5,
      color: rgb(0.05, 0.05, 0.05),
    });
    page.drawText('TOTAL:', {
      x: 430,
      y: 672,
      font: bold,
      size: 9,
      color: rgb(0.05, 0.05, 0.05),
    });
    page.drawText(`USD ${(totalCents / 100).toFixed(2)}`, {
      x: 476,
      y: 672,
      font: bold,
      size: 9,
      color: rgb(0.05, 0.05, 0.05),
    });
    return page;
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
    const churchWidth = 80;
    const contributorWidth = 120;
    const monthWidth = 39;
    const totalWidth = 70;
    const tableWidth =
      churchWidth + contributorWidth + monthWidth * 12 + totalWidth;
    const columnBoundaries = [
      startX,
      startX + churchWidth,
      startX + churchWidth + contributorWidth,
      ...Array.from(
        { length: 12 },
        (_, index) =>
          startX + churchWidth + contributorWidth + (index + 1) * monthWidth,
      ),
      startX + tableWidth,
    ];

    const addAnnualPage = () => {
      const page = document.addPage([792, 612]);
      page.drawRectangle({
        x: 0,
        y: 570,
        width: 792,
        height: 42,
        color: rgb(1, 1, 1),
      });
      this.drawUniversalLogo(page, logo, 28, 576, 210, 28);
      page.drawRectangle({
        x: 0,
        y: 520,
        width: 792,
        height: 50,
        color: rgb(0.01, 0.19, 0.32),
      });
      page.drawText('ANNUAL DONOR REPORT', {
        x: 28,
        y: 547,
        font: bold,
        size: 15,
        color: rgb(1, 1, 1),
      });
      page.drawText(this.clean(churchName), {
        x: 28,
        y: 530,
        font: regular,
        size: 10,
        color: rgb(0.78, 0.88, 0.94),
      });
      page.drawText(
        `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`,
        {
          x: 28,
          y: 500,
          font: bold,
          size: 9,
          color: rgb(0.05, 0.12, 0.22),
        },
      );
      page.drawText(`USD ${(totalCents / 100).toFixed(2)}`, {
        x: 688,
        y: 500,
        font: bold,
        size: 9,
        color: rgb(0.02, 0.36, 0.61),
      });
      page.drawRectangle({
        x: startX,
        y: 462,
        width: tableWidth,
        height: 24,
        color: rgb(0.9, 0.95, 0.98),
      });
      const drawHeaderLabel = (label: string, x: number, width: number) => {
        const labelWidth = bold.widthOfTextAtSize(label, 6.5);
        page.drawText(label, {
          x: x + (width - labelWidth) / 2,
          y: 470,
          font: bold,
          size: 6.5,
          color: rgb(0.02, 0.28, 0.5),
        });
      };

      drawHeaderLabel('CHURCH', startX, churchWidth);
      drawHeaderLabel('CONTRIBUTOR', startX + churchWidth, contributorWidth);
      monthLabels.forEach((label, index) => {
        drawHeaderLabel(
          label,
          startX + churchWidth + contributorWidth + index * monthWidth,
          monthWidth,
        );
      });
      drawHeaderLabel('TOTAL', startX + tableWidth - totalWidth, totalWidth);

      columnBoundaries.forEach((x) => {
        page.drawLine({
          start: { x, y: 462 },
          end: { x, y: 486 },
          thickness: 0.35,
          color: rgb(0.76, 0.84, 0.89),
        });
      });
      return page;
    };

    let page = addAnnualPage();
    let y = 444;
    const monthlyGrandTotals = Array.from({ length: 12 }, () => 0);
    rows.forEach((row) =>
      row.months.forEach((amount, month) => {
        monthlyGrandTotals[month] = (monthlyGrandTotals[month] ?? 0) + amount;
      }),
    );
    const displayRows = [
      ...rows.map((row) => ({ ...row, churchName, totalRow: false })),
      {
        churchName: 'TOTAL',
        label: '',
        months: monthlyGrandTotals,
        totalCents,
        totalRow: true,
      },
    ];

    displayRows.forEach((row, index) => {
      if (y < 34) {
        page = addAnnualPage();
        y = 444;
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
      page.drawText(this.clean(row.churchName).slice(0, 14), {
        x: startX + 6,
        y,
        font: rowFont,
        size: 6.3,
        color: rgb(0.05, 0.12, 0.22),
      });
      page.drawText(this.clean(row.label).slice(0, 21), {
        x: startX + churchWidth + 6,
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
            churchWidth +
            contributorWidth +
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
      columnBoundaries.forEach((x) => {
        page.drawLine({
          start: { x, y: y - 7 },
          end: { x, y: y + 14 },
          thickness: 0.3,
          color: rgb(0.84, 0.89, 0.92),
        });
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
      y: 630,
      font: bold,
      size: 12,
      color: rgb(0.02, 0.28, 0.5),
    });
    let y = 590;

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
          y: 630,
          font: bold,
          size: 12,
          color: rgb(0.02, 0.28, 0.5),
        });
        y = 590;
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
      y: 742,
      width: 612,
      height: 50,
      color: rgb(1, 1, 1),
    });
    this.drawUniversalLogo(page, logo, 44, 750, 250, 32);
    page.drawRectangle({
      x: 0,
      y: 682,
      width: 612,
      height: 60,
      color: rgb(0.01, 0.19, 0.32),
    });
    page.drawText('DONATIONS REPORT', {
      x: 44,
      y: 710,
      font: bold,
      size: 15,
      color: rgb(1, 1, 1),
    });
    page.drawText(this.clean(churchName), {
      x: 44,
      y: 692,
      font: regular,
      size: 10,
      color: rgb(0.78, 0.88, 0.94),
    });
    page.drawText(
      `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`,
      {
        x: 44,
        y: 662,
        font: bold,
        size: 11,
        color: rgb(0.05, 0.12, 0.22),
      },
    );
    page.drawText(`USD ${(totalCents / 100).toFixed(2)}`, {
      x: 470,
      y: 662,
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
          'https://uckg-donations-web.vercel.app/universal-report-logo.png',
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
    maxWidth: number,
    maxHeight: number,
  ) {
    if (!logo) return;
    const dimensions = logo.scaleToFit(maxWidth, maxHeight);
    page.drawImage(logo, {
      x,
      y,
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
      const label = item.member?.fullName ?? 'UNDESIGNATED FUNDS';
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

  private receiptAddress(member: DonationItem['member'], churchName: string) {
    if (!member) return this.clean(churchName);

    const street = [member.addressLine1, member.addressLine2]
      .filter(Boolean)
      .join(', ');
    const locality = [member.city, member.region, member.postalCode]
      .filter(Boolean)
      .join(', ');
    return this.clean(
      [street, locality].filter(Boolean).join(' - ') || churchName,
    );
  }

  private clean(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7e]/g, '?');
  }
}
