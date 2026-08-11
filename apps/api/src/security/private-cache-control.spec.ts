import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { preventPrivateResponseCaching } from './private-cache-control.js';

describe('private response cache control', () => {
  it('prevents browsers and shared infrastructure from storing API data', () => {
    const response = {
      setHeader: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    preventPrivateResponseCaching({} as Request, response, next);

    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store, max-age=0',
    );
    expect(response.setHeader).toHaveBeenCalledWith('Expires', '0');
    expect(response.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
    expect(next).toHaveBeenCalledOnce();
  });
});
