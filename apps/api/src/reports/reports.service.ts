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
      const month = await this.annualBook.month(context, startDate.slice(0, 7));
      const [year, monthNumber] = month.month.split('-').map(Number);
      const priorStartDate = `${year! - 1}-${String(monthNumber).padStart(2, '0')}-01`;
      const priorEndDate = new Date(Date.UTC(year! - 1, monthNumber!, 0))
        .toISOString()
        .slice(0, 10);
      const priorYear = await this.annualBook.summary(context, {
        endDate: priorEndDate,
        startDate: priorStartDate,
      });
      envelopeCount = month.days.filter((day) => day.saved).length;
      totalCents = month.summary.totalWithAthCents;
      buffer = await this.createAnnualBookMonthPdf(
        churchName,
        month,
        priorYear.metrics.totalWithAthCents,
      );
    } else {
      const items = await this.donations.list(context, {
        endDate,
        memberId,
        startDate,
      });
      const undesignatedCents =
        reportType === 'detailed' || reportType === 'member_totals'
          ? (
              await this.annualBook.summary(context, {
                endDate,
                startDate,
              })
            ).metrics.undesignatedCents
          : 0;
      envelopeCount = items.length;
      totalCents =
        items.reduce((sum, item) => sum + item.amountCents, 0) +
        undesignatedCents;
      buffer = await this.createPdf(
        context,
        churchName,
        startDate,
        endDate,
        reportType,
        effectiveIncludeImages,
        items,
        undesignatedCents,
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
    const logo = await this.loadProgramLogo(document);
    const page = document.addPage([612, 792]);
    page.drawRectangle({
      x: 0,
      y: 742,
      width: 612,
      height: 50,
      color: rgb(1, 1, 1),
    });
    this.drawProgramLogo(page, logo, 44, 750, 32, 32);
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
      ['Cards recorded', metrics.cardCents],
      ['Checks', metrics.checkCents],
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

  private async createAnnualBookMonthPdf(
    churchName: string,
    month: Awaited<ReturnType<AnnualBookService['month']>>,
    priorYearTotalCents: number,
  ) {
    const document = await PDFDocument.create();
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const slots = [
      { key: 'first', label: '1ª REUNIÃO' },
      { key: 'second', label: '2ª REUNIÃO' },
      { key: 'third', label: '3ª REUNIÃO' },
      { key: 'fourth', label: '4ª REUNIÃO' },
      { key: 'extra', label: 'EXTRA' },
    ] as const;
    const methods = [
      { key: 'cash', label: 'DINHEIRO' },
      { key: 'card', label: 'CARTÃO' },
      { key: 'check', label: 'CHEQUE' },
    ] as const;
    const pageWidth = 842;
    const pageHeight = 1191;
    const startX = 16;
    const dayWidth = 46;
    const methodWidth = 46;
    const slotWidth = 72;
    const subtotalWidth = 74;
    const dailyTotalWidth = 92;
    const tableWidth =
      dayWidth +
      methodWidth +
      slotWidth * slots.length +
      subtotalWidth +
      dailyTotalWidth;
    const sidebarX = startX + tableWidth + 14;
    const sidebarWidth = pageWidth - sidebarX - 16;
    const dayRowHeight = 18;
    const dayBlockHeight = dayRowHeight * methods.length;
    const totalRowHeight = 20;
    const monthTitle = new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      timeZone: 'UTC',
      year: 'numeric',
    }).format(new Date(`${month.month}-01T12:00:00Z`));
    const weekday = (date: string) =>
      new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'UTC',
        weekday: 'short',
      })
        .format(new Date(`${date}T12:00:00Z`))
        .replace('.', '')
        .toUpperCase();
    const money = (amountCents: number) =>
      amountCents
        ? new Intl.NumberFormat('pt-BR', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          }).format(amountCents / 100)
        : '-';
    const dayValue = (
      day: (typeof month.days)[number],
      slot: string,
      method: string,
    ) =>
      day.entries.find(
        (entry) => entry.serviceSlot === slot && entry.paymentMethod === method,
      )?.amountCents ?? 0;
    const sumDays = (
      days: typeof month.days,
      key: keyof (typeof month.days)[number]['metrics'],
    ) =>
      days.reduce((sum, day) => {
        const value = day.metrics[key];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);
    const expectedDepositsBySourceDate = new Map<
      string,
      typeof month.expectedDeposits
    >();
    const availableDates = new Set(month.days.map((day) => day.entryDate));
    month.expectedDeposits.forEach((deposit) => {
      const sourceDates = deposit.sourceDates
        .filter((date) => availableDates.has(date))
        .sort();
      const sourceDate = sourceDates[sourceDates.length - 1];
      if (!sourceDate) return;
      const current = expectedDepositsBySourceDate.get(sourceDate) ?? [];
      current.push(deposit);
      expectedDepositsBySourceDate.set(sourceDate, current);
    });

    let pageNumber = 0;
    const addPage = () => {
      pageNumber += 1;
      const page = document.addPage([pageWidth, pageHeight]);
      const navy = rgb(0.01, 0.12, 0.38);
      const blue = rgb(0.02, 0.42, 0.72);
      page.drawRectangle({
        x: startX,
        y: 1110,
        width: tableWidth,
        height: 65,
        color: navy,
      });
      page.drawText(monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1), {
        x: startX + 10,
        y: 1141,
        font: bold,
        size: 22,
        color: rgb(1, 1, 1),
      });
      page.drawText(this.clean(churchName), {
        x: startX + 10,
        y: 1118,
        font: regular,
        size: 7.5,
        color: rgb(0.78, 0.88, 0.94),
      });
      page.drawText('TOTAL MÊS', {
        x: startX + 250,
        y: 1147,
        font: bold,
        size: 7,
        color: rgb(1, 1, 1),
      });
      const monthWithoutAth = money(month.summary.totalWithoutAthCents);
      const monthWithAth = money(month.summary.totalWithAthCents);
      page.drawText(monthWithoutAth, {
        x: startX + 345,
        y: 1138,
        font: bold,
        size: 16,
        color: rgb(1, 1, 1),
      });
      page.drawText('SEM ONLINE', {
        x: startX + 360,
        y: 1117,
        font: regular,
        size: 6,
        color: rgb(0.78, 0.88, 0.94),
      });
      page.drawText(monthWithAth, {
        x: startX + 500,
        y: 1138,
        font: bold,
        size: 16,
        color: rgb(1, 1, 1),
      });
      page.drawText('COM ONLINE', {
        x: startX + 520,
        y: 1117,
        font: regular,
        size: 6,
        color: rgb(0.78, 0.88, 0.94),
      });

      page.drawRectangle({
        x: sidebarX,
        y: 1110,
        width: sidebarWidth,
        height: 65,
        color: navy,
      });
      page.drawText(money(priorYearTotalCents), {
        x: sidebarX + 8,
        y: 1140,
        font: bold,
        size: 11,
        color: rgb(1, 1, 1),
      });
      page.drawText('MESMO MÊS ANO ANTERIOR', {
        x: sidebarX + 8,
        y: 1118,
        font: regular,
        size: 5.5,
        color: rgb(0.78, 0.88, 0.94),
      });
      const comparison = month.summary.totalWithAthCents - priorYearTotalCents;
      const comparisonText = money(comparison);
      const comparisonWidth = bold.widthOfTextAtSize(comparisonText, 11);
      page.drawText(comparisonText, {
        x: sidebarX + sidebarWidth - comparisonWidth - 8,
        y: 1128,
        font: bold,
        size: 11,
        color: comparison >= 0 ? rgb(0.43, 1, 0.62) : rgb(1, 0.62, 0.62),
      });
      page.drawRectangle({
        x: sidebarX,
        y: 1092,
        width: sidebarWidth,
        height: 12,
        color: rgb(0.95, 0.39, 0.08),
      });
      page.drawText('RESUMO MENSAL', {
        x: sidebarX + 8,
        y: 1096,
        font: bold,
        size: 5.5,
        color: rgb(1, 1, 1),
      });

      const headerTop = 1092;
      const headers = [
        { label: 'DIA', x: startX, width: dayWidth },
        { label: 'MÉTODO', x: startX + dayWidth, width: methodWidth },
        ...slots.map((slot, index) => ({
          label: slot.label,
          x: startX + dayWidth + methodWidth + index * slotWidth,
          width: slotWidth,
        })),
        {
          label: 'SUB-TOTAIS',
          x: startX + dayWidth + methodWidth + slots.length * slotWidth,
          width: subtotalWidth,
        },
        {
          label: 'TOTAIS',
          x:
            startX +
            dayWidth +
            methodWidth +
            slots.length * slotWidth +
            subtotalWidth,
          width: dailyTotalWidth,
        },
      ];
      headers.forEach((header) => {
        page.drawRectangle({
          x: header.x,
          y: headerTop - 24,
          width: header.width,
          height: 24,
          color: blue,
        });
        const labelWidth = bold.widthOfTextAtSize(header.label, 7);
        page.drawText(header.label, {
          x: header.x + (header.width - labelWidth) / 2,
          y: headerTop - 16,
          font: bold,
          size: 7,
          color: rgb(1, 1, 1),
        });
      });

      page.drawText(`Página ${pageNumber}`, {
        x: pageWidth - 58,
        y: 16,
        font: regular,
        size: 6,
        color: rgb(0.4, 0.45, 0.5),
      });
      return { page, top: headerTop - 24 };
    };

    let { page, top } = addPage();
    let weekStartIndex = 0;
    let weekNumber = 0;
    const weekNames = [
      'PRIMEIRA',
      'SEGUNDA',
      'TERCEIRA',
      'QUARTA',
      'QUINTA',
      'SEXTA',
    ];
    for (const [dayIndex, day] of month.days.entries()) {
      const currentWeekday = new Date(`${day.entryDate}T12:00:00Z`).getUTCDay();
      if (dayIndex === 0 || currentWeekday === 1) {
        weekStartIndex = dayIndex;
        if (dayIndex > 0) ({ page, top } = addPage());
      }
      const blockTop = top;
      const subtotalX =
        startX + dayWidth + methodWidth + slots.length * slotWidth;
      const dailyTotalX = subtotalX + subtotalWidth;
      page.drawRectangle({
        x: startX,
        y: blockTop - dayBlockHeight,
        width: dayWidth,
        height: dayBlockHeight,
        color: dayIndex % 2 === 0 ? rgb(0.94, 0.97, 0.99) : rgb(0.98, 0.99, 1),
      });
      const dayText = `${day.entryDate.slice(8, 10)} ${weekday(day.entryDate)}`;
      const dayWidthText = bold.widthOfTextAtSize(dayText, 10);
      page.drawText(dayText, {
        x: startX + (dayWidth - dayWidthText) / 2,
        y: blockTop - 38,
        font: bold,
        size: 10,
        color: rgb(0.27, 0.31, 0.35),
      });
      page.drawRectangle({
        x: dailyTotalX,
        y: blockTop - dayBlockHeight,
        width: dailyTotalWidth,
        height: dayBlockHeight,
        color: rgb(0.94, 0.96, 0.98),
        borderColor: rgb(0.02, 0.42, 0.72),
        borderWidth: 0.5,
      });
      const dayTotal = money(day.metrics.totalWithAthCents);
      const dayTotalWidth = bold.widthOfTextAtSize(dayTotal, 11);
      page.drawText(dayTotal, {
        x: dailyTotalX + (dailyTotalWidth - dayTotalWidth) / 2,
        y: blockTop - 34,
        font: bold,
        size: 11,
        color: rgb(0.28, 0.31, 0.34),
      });
      methods.forEach((method, methodIndex) => {
        const rowTop = blockTop - methodIndex * dayRowHeight;
        page.drawRectangle({
          x: startX + dayWidth,
          y: rowTop - dayRowHeight,
          width: dailyTotalX - (startX + dayWidth),
          height: dayRowHeight,
          color: dayIndex % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
        });
        page.drawText(method.label, {
          x: startX + dayWidth + 8,
          y: rowTop - 14,
          font: regular,
          size: 7,
          color: rgb(0.32, 0.36, 0.4),
        });
        slots.forEach((slot, slotIndex) => {
          const amount = dayValue(day, slot.key, method.key);
          const text = money(amount);
          const textWidth = regular.widthOfTextAtSize(text, 7.5);
          page.drawText(text, {
            x:
              startX +
              dayWidth +
              methodWidth +
              slotIndex * slotWidth +
              (slotWidth - textWidth) / 2,
            y: rowTop - 14,
            font: regular,
            size: 7.5,
            color: rgb(0.18, 0.22, 0.27),
          });
        });
        const methodSubtotal = slots.reduce(
          (sum, slot) => sum + dayValue(day, slot.key, method.key),
          0,
        );
        const subtotalText = money(methodSubtotal);
        const subtotalTextWidth = regular.widthOfTextAtSize(subtotalText, 7);
        page.drawText(subtotalText, {
          x: subtotalX + subtotalWidth - subtotalTextWidth - 6,
          y: rowTop - 13,
          font: regular,
          size: 7,
          color: rgb(0.18, 0.22, 0.27),
        });
        page.drawLine({
          start: { x: startX + dayWidth, y: rowTop - dayRowHeight },
          end: { x: dailyTotalX, y: rowTop - dayRowHeight },
          thickness: 0.35,
          color: rgb(0.42, 0.62, 0.78),
        });
      });
      for (let boundary = 0; boundary <= slots.length; boundary += 1) {
        const x = startX + dayWidth + methodWidth + boundary * slotWidth;
        page.drawLine({
          start: { x, y: blockTop - dayBlockHeight },
          end: { x, y: blockTop },
          thickness: 0.35,
          color: rgb(0.42, 0.62, 0.78),
        });
      }
      [
        startX,
        startX + dayWidth,
        subtotalX,
        dailyTotalX,
        startX + tableWidth,
      ].forEach((x) => {
        page.drawLine({
          start: { x, y: blockTop - dayBlockHeight },
          end: { x, y: blockTop },
          thickness: 0.4,
          color: rgb(0.02, 0.42, 0.72),
        });
      });
      page.drawLine({
        start: { x: startX + dayWidth, y: blockTop - dayBlockHeight },
        end: { x: startX + tableWidth, y: blockTop - dayBlockHeight },
        thickness: 0.35,
        color: rgb(0.42, 0.62, 0.78),
      });
      const totalsTop = blockTop - dayBlockHeight;
      page.drawRectangle({
        x: startX,
        y: totalsTop - totalRowHeight,
        width: tableWidth,
        height: totalRowHeight,
        color: rgb(0.01, 0.12, 0.38),
      });
      page.drawRectangle({
        x: dailyTotalX,
        y: totalsTop - totalRowHeight,
        width: dailyTotalWidth,
        height: totalRowHeight,
        color: rgb(1, 0.95, 0.77),
        borderColor: rgb(0.02, 0.42, 0.72),
        borderWidth: 0.5,
      });
      page.drawText('Totais por Reunião', {
        x: startX + 8,
        y: totalsTop - 16,
        font: regular,
        size: 9,
        color: rgb(1, 1, 1),
      });
      slots.forEach((slot, slotIndex) => {
        const total = methods.reduce(
          (sum, method) => sum + dayValue(day, slot.key, method.key),
          0,
        );
        const text = money(total);
        const textWidth = regular.widthOfTextAtSize(text, 8);
        page.drawText(text, {
          x:
            startX +
            dayWidth +
            methodWidth +
            slotIndex * slotWidth +
            (slotWidth - textWidth) / 2,
          y: totalsTop - 16,
          font: bold,
          size: 8,
          color: rgb(1, 1, 1),
        });
      });
      page.drawText('Total de ENVELOPES', {
        x: subtotalX + 5,
        y: totalsTop - 13,
        font: bold,
        size: 6,
        color: rgb(1, 1, 1),
      });
      const envelopesText = money(day.designatedEnvelopeCents);
      const envelopesWidth = bold.widthOfTextAtSize(envelopesText, 8);
      page.drawText(envelopesText, {
        x: dailyTotalX + dailyTotalWidth - envelopesWidth - 6,
        y: totalsTop - 14,
        font: bold,
        size: 8,
        color: rgb(0.12, 0.18, 0.24),
      });
      top = totalsTop - totalRowHeight - 10;

      for (const deposit of expectedDepositsBySourceDate.get(day.entryDate) ??
        []) {
        const depositHeight = 28;
        page.drawRectangle({
          x: startX,
          y: top - depositHeight,
          width: tableWidth,
          height: depositHeight,
          color: rgb(0.88, 0.94, 0.97),
          borderColor: rgb(0.02, 0.42, 0.72),
          borderWidth: 0.5,
        });
        const dueDate = `${deposit.depositDate.slice(8, 10)}/${deposit.depositDate.slice(5, 7)}`;
        page.drawText(`DEPÓSITO ESPERADO — ${dueDate}`, {
          x: startX + 8,
          y: top - 11,
          font: bold,
          size: 7,
          color: rgb(0.02, 0.28, 0.5),
        });
        const depositTotal = money(deposit.totalCents);
        const depositTotalWidth = bold.widthOfTextAtSize(depositTotal, 9);
        page.drawText(depositTotal, {
          x: startX + tableWidth - depositTotalWidth - 8,
          y: top - 19,
          font: bold,
          size: 9,
          color: rgb(0.02, 0.28, 0.5),
        });
        top -= depositHeight + 8;
      }

      const isWeekEnd =
        currentWeekday === 0 || dayIndex === month.days.length - 1;
      if (isWeekEnd) {
        weekNumber += 1;
        const weekDays = month.days.slice(weekStartIndex, dayIndex + 1);
        const summaryHeight = 54;
        page.drawRectangle({
          x: startX,
          y: top - summaryHeight,
          width: tableWidth,
          height: summaryHeight,
          color: rgb(0.01, 0.12, 0.38),
        });
        page.drawText(
          `${weekNames[weekNumber - 1] ?? weekNumber + 'ª'} SEMANA`,
          {
            x: startX + 22,
            y: top - 32,
            font: bold,
            size: 12,
            color: rgb(1, 1, 1),
          },
        );
        const weeklyCells = [
          ['DINHEIRO', sumDays(weekDays, 'cashCents')],
          ['CARTÃO', sumDays(weekDays, 'cardCents')],
          ['CHEQUE', sumDays(weekDays, 'checkCents')],
          ['ONLINE', sumDays(weekDays, 'athMobileCents')],
        ] as const;
        weeklyCells.forEach(([label, value], index) => {
          const x = startX + 168 + index * 82;
          page.drawText(label, {
            x,
            y: top - 18,
            font: regular,
            size: 5.5,
            color: rgb(0.82, 0.89, 0.95),
          });
          const valueText = money(value);
          const valueWidth = bold.widthOfTextAtSize(valueText, 8);
          page.drawText(valueText, {
            x: x + (74 - valueWidth) / 2,
            y: top - 39,
            font: bold,
            size: 8,
            color: rgb(1, 1, 1),
          });
        });
        const weekTotal = money(sumDays(weekDays, 'totalWithAthCents'));
        const weekTotalWidth = bold.widthOfTextAtSize(weekTotal, 14);
        page.drawText('TOTAL SEMANA', {
          x: startX + tableWidth - 86,
          y: top - 18,
          font: regular,
          size: 5.5,
          color: rgb(0.82, 0.89, 0.95),
        });
        page.drawText(weekTotal, {
          x: startX + tableWidth - weekTotalWidth - 12,
          y: top - 36,
          font: bold,
          size: 14,
          color: rgb(1, 1, 1),
        });
        top -= summaryHeight + 18;
      }
    }

    if (top - 170 < 64) ({ page, top } = addPage());
    page.drawText('Fechamento do mês', {
      x: startX,
      y: top - 18,
      font: bold,
      size: 12,
      color: rgb(0.02, 0.28, 0.5),
    });
    const closingRows: Array<[string, number]> = [
      ['Dinheiro', month.summary.cashCents],
      ['Cartão', month.summary.cardCents],
      ['Cheque', month.summary.checkCents],
      ['Online', month.summary.athMobileCents],
      ['Designado (envelopes)', month.summary.designatedEnvelopeCents],
      ['Não designado', month.summary.undesignatedCents],
      ['Depósito esperado', month.summary.expectedDepositCents],
      ['Total geral', month.summary.totalWithAthCents],
    ];
    let closingY = top - 40;
    closingRows.forEach(([label, amount], index) => {
      if (index % 2 === 0)
        page.drawRectangle({
          x: startX,
          y: closingY - 8,
          width: tableWidth,
          height: 22,
          color: rgb(0.94, 0.97, 0.99),
        });
      page.drawText(label, {
        x: startX + 8,
        y: closingY,
        font: index === closingRows.length - 1 ? bold : regular,
        size: 9,
        color: rgb(0.05, 0.12, 0.22),
      });
      const text = money(amount);
      const textWidth = bold.widthOfTextAtSize(text, 9);
      page.drawText(text, {
        x: startX + tableWidth - textWidth - 8,
        y: closingY,
        font: bold,
        size: 9,
        color: rgb(0.02, 0.28, 0.5),
      });
      closingY -= 22;
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
    undesignatedCents = 0,
  ) {
    const document = await PDFDocument.create();
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const logo = await this.loadProgramLogo(document);
    const total =
      items.reduce((sum, item) => sum + item.amountCents, 0) +
      undesignatedCents;
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

    if (reportType === 'detailed') {
      return this.createDetailedTablePdf(
        document,
        bold,
        regular,
        churchName,
        startDate,
        endDate,
        items,
        logo,
        undesignatedCents,
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
        undesignatedCents,
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
        logo,
        total,
      );
    }

    return Buffer.from(await document.save());
  }

  private async createDetailedTablePdf(
    document: PDFDocument,
    bold: PDFFont,
    regular: PDFFont,
    churchName: string,
    startDate: string,
    endDate: string,
    items: DonationItem[],
    logo: PDFImage | null,
    undesignatedCents: number,
  ) {
    const totalCents =
      items.reduce((sum, item) => sum + item.amountCents, 0) +
      undesignatedCents;
    const rows: Array<
      | { amountCents: number; isUndesignated: true }
      | { isUndesignated: false; item: DonationItem }
    > = [
      { amountCents: undesignatedCents, isUndesignated: true },
      ...items.map((item) => ({ isUndesignated: false as const, item })),
    ];
    const startX = 34;
    const columns = [
      { label: 'DATE', width: 82 },
      { label: 'MEMBER', width: 190 },
      { label: 'AMOUNT', width: 92 },
      { label: 'PAYMENT METHOD', width: 112 },
      { label: 'IMAGE', width: 69 },
    ];
    const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
    const rowHeight = 25;
    const headerHeight = 27;
    const rowTextY = (top: number) => top - 17;
    const boundaries = [
      startX,
      ...columns.map((column, index) =>
        columns
          .slice(0, index + 1)
          .reduce((sum, current) => sum + current.width, startX),
      ),
    ];

    const addTablePage = () => {
      const page = this.addPage(
        document,
        bold,
        regular,
        churchName,
        startDate,
        endDate,
        logo,
        totalCents,
      );
      const headerTop = 640;
      page.drawRectangle({
        x: startX,
        y: headerTop - headerHeight,
        width: tableWidth,
        height: headerHeight,
        color: rgb(0.02, 0.28, 0.5),
      });
      columns.forEach((column, index) => {
        const labelWidth = bold.widthOfTextAtSize(column.label, 7);
        const boundary = boundaries[index]!;
        page.drawText(column.label, {
          x: boundary + (column.width - labelWidth) / 2,
          y: headerTop - 18,
          font: bold,
          size: 7,
          color: rgb(1, 1, 1),
        });
      });
      return { page, top: headerTop - headerHeight };
    };

    let { page, top } = addTablePage();
    rows.forEach((row, index) => {
      if (top - rowHeight < 80) {
        ({ page, top } = addTablePage());
      }
      const rowTop = top;
      if (index % 2 === 0) {
        page.drawRectangle({
          x: startX,
          y: rowTop - rowHeight,
          width: tableWidth,
          height: rowHeight,
          color: rgb(0.96, 0.98, 0.99),
        });
      }
      const values = row.isUndesignated
        ? [
            '-',
            'UNDESIGNATED',
            `USD ${(row.amountCents / 100).toFixed(2)}`,
            '-',
            '-',
          ]
        : [
            this.formatDate(row.item.receivedOn),
            row.item.member?.fullName ?? 'Anonymous',
            `USD ${(row.item.amountCents / 100).toFixed(2)}`,
            this.methodLabel(row.item.paymentMethod),
            row.item.envelope ? 'YES' : '-',
          ];
      values.forEach((value, columnIndex) => {
        const column = columns[columnIndex];
        if (!column) return;
        const text = this.clean(value).slice(0, columnIndex === 1 ? 30 : 20);
        const textWidth = regular.widthOfTextAtSize(text, 8.5);
        const centered = columnIndex === 0 || columnIndex >= 2;
        const boundary = boundaries[columnIndex]!;
        page.drawText(text, {
          x: centered
            ? boundary + (column.width - textWidth) / 2
            : boundary + 8,
          y: rowTextY(rowTop),
          font: columnIndex === 2 ? bold : regular,
          size: 8.5,
          color: rgb(0.05, 0.12, 0.22),
        });
      });
      boundaries.forEach((x) => {
        page.drawLine({
          start: { x, y: rowTop - rowHeight },
          end: { x, y: rowTop },
          thickness: 0.35,
          color: rgb(0.82, 0.88, 0.92),
        });
      });
      page.drawLine({
        start: { x: startX, y: rowTop - rowHeight },
        end: { x: startX + tableWidth, y: rowTop - rowHeight },
        thickness: 0.35,
        color: rgb(0.82, 0.88, 0.92),
      });
      top -= rowHeight;
    });

    if (top - 34 < 80) ({ page, top } = addTablePage());
    page.drawRectangle({
      x: startX,
      y: top - 30,
      width: tableWidth,
      height: 30,
      color: rgb(0.88, 0.94, 0.97),
    });
    page.drawText('TOTAL', {
      x: boundaries[0]! + 8,
      y: top - 20,
      font: bold,
      size: 9,
      color: rgb(0.02, 0.28, 0.5),
    });
    const totalText = `USD ${(totalCents / 100).toFixed(2)}`;
    const totalWidth = bold.widthOfTextAtSize(totalText, 9);
    const amountColumn = columns[2]!;
    page.drawText(totalText, {
      x: boundaries[2]! + amountColumn.width - totalWidth - 8,
      y: top - 20,
      font: bold,
      size: 9,
      color: rgb(0.02, 0.28, 0.5),
    });
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
    undesignatedCents: number,
  ) {
    const rows = [
      { count: 0, label: 'UNDESIGNATED', totalCents: undesignatedCents },
      ...this.memberTotals(items),
    ];
    const totalCents =
      items.reduce((sum, item) => sum + item.amountCents, 0) +
      undesignatedCents;
    const startX = 44;
    const churchColumnWidth = 104;
    const amountColumnWidth = 142;
    const contributorColumnWidth = 278;
    const tableWidth =
      churchColumnWidth + amountColumnWidth + contributorColumnWidth;

    const addSummaryPage = () => {
      const page = document.addPage([612, 792]);
      this.drawProgramLogo(page, logo, 44, 738, 32, 32);
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
    this.drawProgramLogo(page, logo, 44, 738, 32, 32);

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
      this.drawProgramLogo(page, logo, 28, 576, 28, 28);
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
    this.drawProgramLogo(page, logo, 44, 750, 32, 32);
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

  private async loadProgramLogo(document: PDFDocument) {
    try {
      const response = await fetch(
        process.env.PROGRAM_LOGO_URL ??
          'https://uckg-donations-web.vercel.app/program-logo.png',
        { signal: AbortSignal.timeout(3000) },
      );
      if (!response.ok) return null;
      return await document.embedPng(await response.arrayBuffer());
    } catch {
      return null;
    }
  }

  private drawProgramLogo(
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
