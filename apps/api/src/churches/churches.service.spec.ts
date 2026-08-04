import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../database/database.service.js';
import { ChurchesService } from './churches.service.js';

describe('ChurchesService', () => {
  it('lists only active churches in name order', async () => {
    const churches = [
      { id: 'church-a', name: 'Alpha Church' },
      { id: 'church-b', name: 'Beta Church' },
    ];
    const orderBy = vi.fn().mockResolvedValue(churches);
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    const database = {
      db: { select: vi.fn().mockReturnValue({ from }) },
    } as unknown as DatabaseService;
    const service = new ChurchesService(database);

    await expect(service.list()).resolves.toEqual(churches);

    expect(where).toHaveBeenCalledOnce();
    expect(orderBy).toHaveBeenCalledOnce();
  });

  it('creates a church with internal identity and US defaults', async () => {
    const church = {
      id: 'church-a',
      locale: 'en',
      name: 'Igreja São João',
      slug: 'igreja-sao-joao-generated',
      timezone: 'America/New_York',
    };
    const returning = vi.fn().mockResolvedValue([church]);
    const values = vi.fn().mockReturnValue({ returning });
    const database = {
      db: { insert: vi.fn().mockReturnValue({ values }) },
    } as unknown as DatabaseService;
    const service = new ChurchesService(database);

    await expect(service.create({ name: church.name })).resolves.toBe(church);

    expect(values).toHaveBeenCalledWith({
      locale: 'en',
      name: church.name,
      slug: expect.stringMatching(
        /^igreja-sao-joao-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
      timezone: 'America/New_York',
    });
  });

  it('translates a unique conflict without exposing database details', async () => {
    const returning = vi.fn().mockRejectedValue({ code: '23505' });
    const values = vi.fn().mockReturnValue({ returning });
    const database = {
      db: { insert: vi.fn().mockReturnValue({ values }) },
    } as unknown as DatabaseService;
    const service = new ChurchesService(database);

    await expect(service.create({ name: 'Alpha Church' })).rejects.toThrow(
      ConflictException,
    );
  });
});
