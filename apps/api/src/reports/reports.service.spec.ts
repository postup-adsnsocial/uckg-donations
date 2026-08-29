import { PDFDocument } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';

import type { TenantContext } from '../database/tenant-unit-of-work.js';
import type { TenantUnitOfWork } from '../database/tenant-unit-of-work.js';
import type { AnnualBookService } from '../annual-book/annual-book.service.js';
import type { DonationsService } from '../donations/donations.service.js';
import type { PrivateObjectStorage } from '../storage/private-object-storage.js';
import { ReportsService } from './reports.service.js';

const context: TenantContext = {
  actorId: '4cf89a1e-c906-41e3-bd45-eecb6d1f70b7',
  churchId: '7946ce5a-e1fe-493a-bd8c-b9ca848efc3e',
  correlationId: '801696e2-ed86-4746-bc05-499dfb75d903',
};

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XAR7WQAAAABJRU5ErkJggg==',
  'base64',
);

describe('ReportsService detailed PDF', () => {
  it('keeps each envelope image in the same PDF card as its donation', async () => {
    const item = {
      amountCents: 12500,
      createdAt: new Date('2026-08-04T12:00:00Z'),
      envelope: {
        contentType: 'image/png',
        originalName: 'envelope.png',
        sizeBytes: onePixelPng.length,
      },
      id: 'c127ae2f-c693-4052-b40d-9ae0b7b965d0',
      member: { fullName: 'Member A', id: 'member-a' },
      notes: 'Offering',
      operatorName: 'Operator A',
      paymentMethod: 'cash' as const,
      receivedOn: '2026-08-04',
    };
    const donations = {
      getEnvelope: vi.fn().mockResolvedValue({
        buffer: onePixelPng,
        contentType: 'image/png',
        originalName: 'envelope.png',
      }),
      list: vi.fn().mockResolvedValue([item]),
    } as unknown as DonationsService;
    const values = vi.fn().mockResolvedValue(undefined);
    const transaction = { insert: vi.fn(() => ({ values })) };
    const tenantUnitOfWork = {
      run: vi.fn(
        async (
          _context: TenantContext,
          work: (received: typeof transaction) => Promise<unknown>,
        ) => work(transaction),
      ),
    } as unknown as TenantUnitOfWork;
    const storage = {
      createSignedDownloadUrl: vi.fn().mockResolvedValue(null),
      upload: vi.fn().mockResolvedValue(undefined),
    } as unknown as PrivateObjectStorage;
    const annualBook = {} as AnnualBookService;
    const service = new ReportsService(
      donations,
      annualBook,
      tenantUnitOfWork,
      storage,
    );

    const report = await service.generate(
      context,
      'Universal Church',
      '2026-08-01',
      '2026-08-04',
      'detailed',
      true,
    );
    const pdf = await PDFDocument.load(report.buffer);

    expect(pdf.getPageCount()).toBe(1);
    expect(donations.getEnvelope).toHaveBeenCalledWith(context, item.id);
  });

  it('generates the contributor summary without envelope images', async () => {
    const items = [
      {
        amountCents: 12500,
        createdAt: new Date('2026-04-04T12:00:00Z'),
        envelope: null,
        id: 'c127ae2f-c693-4052-b40d-9ae0b7b965d0',
        member: { fullName: 'Member A', id: 'member-a' },
        notes: null,
        operatorName: 'Operator A',
        paymentMethod: 'cash' as const,
        receivedOn: '2026-04-04',
      },
      {
        amountCents: 5000,
        createdAt: new Date('2026-04-09T12:00:00Z'),
        envelope: null,
        id: '33c23399-1d9a-4c4d-a564-5f41a7c6162c',
        member: null,
        notes: null,
        operatorName: 'Operator A',
        paymentMethod: 'cash' as const,
        receivedOn: '2026-04-09',
      },
    ];
    const donations = {
      getEnvelope: vi.fn(),
      list: vi.fn().mockResolvedValue(items),
    } as unknown as DonationsService;
    const values = vi.fn().mockResolvedValue(undefined);
    const transaction = { insert: vi.fn(() => ({ values })) };
    const tenantUnitOfWork = {
      run: vi.fn(
        async (
          _context: TenantContext,
          work: (received: typeof transaction) => Promise<unknown>,
        ) => work(transaction),
      ),
    } as unknown as TenantUnitOfWork;
    const storage = {
      createSignedDownloadUrl: vi.fn().mockResolvedValue(null),
      upload: vi.fn().mockResolvedValue(undefined),
    } as unknown as PrivateObjectStorage;
    const service = new ReportsService(
      donations,
      {} as AnnualBookService,
      tenantUnitOfWork,
      storage,
    );

    const report = await service.generate(
      context,
      'MAEBO',
      '2026-04-01',
      '2026-04-30',
      'member_totals',
      false,
    );
    const pdf = await PDFDocument.load(report.buffer);

    expect(pdf.getPageCount()).toBe(1);
    expect(donations.getEnvelope).not.toHaveBeenCalled();
  });

  it('generates the Annual Book PDF from financial summary data', async () => {
    const donations = {
      list: vi.fn(),
    } as unknown as DonationsService;
    const annualBook = {
      month: vi.fn().mockResolvedValue({
        days: [
          {
            athMobileCents: 0,
            cardMachineCents: null,
            designatedEnvelopeCents: 0,
            entryDate: '2026-08-01',
            saved: true,
            entries: [
              {
                amountCents: 16_000,
                paymentMethod: 'cash',
                serviceSlot: 'first',
              },
            ],
            metrics: {
              athMobileCents: 0,
              cardCents: 0,
              cardDifferenceCents: null,
              cardMachineCents: 0,
              cashCents: 16_000,
              checkCents: 0,
              designatedEnvelopeCents: 0,
              expectedDepositCents: 16_000,
              totalWithAthCents: 16_000,
              totalWithoutAthCents: 16_000,
              undesignatedCents: 16_000,
            },
            notes: null,
            weekday: 'saturday',
          },
          ...Array.from({ length: 9 }, (_, index) => ({
            athMobileCents: 0,
            cardMachineCents: null,
            designatedEnvelopeCents: 0,
            entryDate: `2026-08-${String(index + 2).padStart(2, '0')}`,
            saved: false,
            entries: [],
            metrics: {
              athMobileCents: 0,
              cardCents: 0,
              cardDifferenceCents: null,
              cardMachineCents: 0,
              cashCents: 0,
              checkCents: 0,
              designatedEnvelopeCents: 0,
              expectedDepositCents: 0,
              totalWithAthCents: 0,
              totalWithoutAthCents: 0,
              undesignatedCents: 0,
            },
            notes: null,
            weekday: 'weekday',
          })),
        ],
        expectedDeposits: [],
        month: '2026-08',
        summary: {
          athMobileCents: 2_000,
          cardCents: 3_000,
          cardDifferenceCents: 0,
          cardMachineCents: 3_000,
          cashCents: 10_000,
          checkCents: 1_000,
          designatedEnvelopeCents: 5_000,
          expectedDepositCents: 11_000,
          totalWithAthCents: 16_000,
          totalWithoutAthCents: 14_000,
          undesignatedCents: 9_000,
        },
        startDate: '2026-08-01',
        endDate: '2026-08-31',
      }),
      summary: vi.fn().mockResolvedValue({
        dayCount: 0,
        endDate: '2025-08-31',
        metrics: {
          athMobileCents: 0,
          cardCents: 0,
          cardDifferenceCents: 0,
          cardMachineCents: 0,
          cashCents: 0,
          checkCents: 0,
          designatedEnvelopeCents: 0,
          expectedDepositCents: 0,
          totalWithAthCents: 0,
          totalWithoutAthCents: 0,
          undesignatedCents: 0,
        },
        startDate: '2025-08-01',
      }),
    } as unknown as AnnualBookService;
    const values = vi.fn().mockResolvedValue(undefined);
    const transaction = { insert: vi.fn(() => ({ values })) };
    const tenantUnitOfWork = {
      run: vi.fn(
        async (
          _context: TenantContext,
          work: (received: typeof transaction) => Promise<unknown>,
        ) => work(transaction),
      ),
    } as unknown as TenantUnitOfWork;
    const storage = {
      createSignedDownloadUrl: vi.fn().mockResolvedValue(null),
      upload: vi.fn().mockResolvedValue(undefined),
    } as unknown as PrivateObjectStorage;
    const service = new ReportsService(
      donations,
      annualBook,
      tenantUnitOfWork,
      storage,
    );

    const report = await service.generate(
      context,
      'Universal Church',
      '2026-08-01',
      '2026-08-31',
      'annual_book',
      false,
    );
    const pdf = await PDFDocument.load(report.buffer);

    expect(pdf.getPageCount()).toBe(3);
    expect(annualBook.month).toHaveBeenCalledWith(context, '2026-08');
    expect(annualBook.summary).toHaveBeenCalledWith(context, {
      endDate: '2025-08-31',
      startDate: '2025-08-01',
    });
    expect(donations.list).not.toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        envelopeCount: 1,
        reportType: 'annual_book',
        totalCents: 16_000,
      }),
    );
  });
});
