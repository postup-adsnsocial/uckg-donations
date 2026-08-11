import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { DonationsController } from './donations.controller.js';

describe('DonationsController', () => {
  it('streams the private image instead of redirecting the browser', async () => {
    const file = {
      buffer: Buffer.from('image-bytes'),
      contentType: 'image/png',
      originalName: 'envelope.png',
    };
    const donations = {
      getEnvelope: vi.fn().mockResolvedValue(file),
    };
    const response = {
      redirect: vi.fn(),
      send: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as Response;
    const controller = new DonationsController(donations as never);

    await controller.getEnvelope(
      { church: { id: 'church-id' } } as never,
      { id: 'user-id' } as never,
      '2edd561c-3a34-4927-a406-cc2fcf345989',
      response,
    );

    expect(donations.getEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'user-id', churchId: 'church-id' }),
      '2edd561c-3a34-4927-a406-cc2fcf345989',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'image/png',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'inline',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store, max-age=0',
    );
    expect(response.send).toHaveBeenCalledWith(file.buffer);
    expect(response.redirect).not.toHaveBeenCalled();
  });

  it('updates a valid envelope inside the active church context', async () => {
    const donations = {
      update: vi.fn().mockResolvedValue({
        id: '2edd561c-3a34-4927-a406-cc2fcf345989',
      }),
    };
    const controller = new DonationsController(donations as never);
    const input = {
      amountCents: 12_345,
      memberId: null,
      notes: 'Updated notes',
      paymentMethod: 'card',
      receivedOn: '2026-08-11',
    };

    await controller.update(
      { church: { id: 'church-id' } } as never,
      { id: 'user-id' } as never,
      '2edd561c-3a34-4927-a406-cc2fcf345989',
      input,
    );

    expect(donations.update).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'user-id', churchId: 'church-id' }),
      '2edd561c-3a34-4927-a406-cc2fcf345989',
      input,
    );
  });
});
