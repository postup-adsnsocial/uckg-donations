import { PDFDocument } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';

import type { TenantContext } from '../database/tenant-unit-of-work.js';
import type { TenantUnitOfWork } from '../database/tenant-unit-of-work.js';
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
    const service = new ReportsService(donations, tenantUnitOfWork, storage);

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
});
