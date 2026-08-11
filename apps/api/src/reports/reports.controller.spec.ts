import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { ReportsController } from './reports.controller.js';

function responseMock() {
  return {
    json: vi.fn(),
    redirect: vi.fn(),
    send: vi.fn(),
    setHeader: vi.fn(),
  } as unknown as Response;
}

describe('ReportsController downloads', () => {
  it('returns a signed download URL instead of redirecting a fetch request', async () => {
    const reports = {
      generate: vi.fn().mockResolvedValue({
        buffer: null,
        filename: 'report.pdf',
        signedUrl: 'https://storage.example.test/report.pdf?token=secret',
      }),
    };
    const controller = new ReportsController(reports as never);
    const response = responseMock();

    await controller.pdf(
      { church: { id: 'church-id', name: 'Church' } } as never,
      { id: 'user-id' } as never,
      '2026-08-01',
      '2026-08-04',
      'detailed',
      'true',
      'url',
      response,
    );

    expect(response.json).toHaveBeenCalledWith({
      filename: 'report.pdf',
      url: 'https://storage.example.test/report.pdf?token=secret&download=report.pdf',
    });
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store, max-age=0',
    );
    expect(response.redirect).not.toHaveBeenCalled();
  });
});
