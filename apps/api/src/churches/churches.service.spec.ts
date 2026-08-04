import { ConflictException, NotFoundException } from '@nestjs/common';
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

  it('updates the name of an active church without changing its identity', async () => {
    const church = {
      id: 'church-a',
      locale: 'en',
      name: 'Updated Church',
      slug: 'stable-church-slug',
      timezone: 'America/New_York',
    };
    const returning = vi.fn().mockResolvedValue([church]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const database = {
      db: { update: vi.fn().mockReturnValue({ set }) },
    } as unknown as DatabaseService;
    const service = new ChurchesService(database);

    await expect(
      service.update(church.id, { name: church.name }),
    ).resolves.toBe(church);

    expect(set).toHaveBeenCalledWith({
      name: church.name,
      updatedAt: expect.any(Date),
    });
  });

  it('archives a church instead of deleting its data', async () => {
    const lock = vi
      .fn()
      .mockResolvedValue([{ id: 'church-a' }, { id: 'church-b' }]);
    const selectWhere = vi.fn().mockReturnValue({ for: lock });
    const from = vi.fn().mockReturnValue({ where: selectWhere });
    const returning = vi.fn().mockResolvedValue([{ id: 'church-b' }]);
    const updateWhere = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where: updateWhere });
    const transaction = {
      select: vi.fn().mockReturnValue({ from }),
      update: vi.fn().mockReturnValue({ set }),
    };
    const database = {
      db: {
        transaction: vi.fn(
          async (callback: (value: typeof transaction) => unknown) =>
            callback(transaction),
        ),
      },
    } as unknown as DatabaseService;
    const service = new ChurchesService(database);

    await expect(service.delete('church-b')).resolves.toEqual({
      deleted: true,
      id: 'church-b',
    });
    expect(lock).toHaveBeenCalledWith('update');
    expect(set).toHaveBeenCalledWith({
      status: 'archived',
      updatedAt: expect.any(Date),
    });
  });

  it('does not archive the last active church', async () => {
    const lock = vi.fn().mockResolvedValue([{ id: 'church-a' }]);
    const selectWhere = vi.fn().mockReturnValue({ for: lock });
    const from = vi.fn().mockReturnValue({ where: selectWhere });
    const transaction = {
      select: vi.fn().mockReturnValue({ from }),
      update: vi.fn(),
    };
    const database = {
      db: {
        transaction: vi.fn(
          async (callback: (value: typeof transaction) => unknown) =>
            callback(transaction),
        ),
      },
    } as unknown as DatabaseService;
    const service = new ChurchesService(database);

    await expect(service.delete('church-a')).rejects.toThrow(ConflictException);
    expect(transaction.update).not.toHaveBeenCalled();
  });

  it('does not update or archive an unavailable church', async () => {
    const updateReturning = vi.fn().mockResolvedValue([]);
    const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
    const set = vi.fn().mockReturnValue({ where: updateWhere });
    const lock = vi.fn().mockResolvedValue([{ id: 'church-a' }]);
    const selectWhere = vi.fn().mockReturnValue({ for: lock });
    const from = vi.fn().mockReturnValue({ where: selectWhere });
    const transaction = { select: vi.fn().mockReturnValue({ from }) };
    const database = {
      db: {
        transaction: vi.fn(
          async (callback: (value: typeof transaction) => unknown) =>
            callback(transaction),
        ),
        update: vi.fn().mockReturnValue({ set }),
      },
    } as unknown as DatabaseService;
    const service = new ChurchesService(database);

    await expect(
      service.update('missing', { name: 'Missing Church' }),
    ).rejects.toThrow(NotFoundException);
    await expect(service.delete('missing')).rejects.toThrow(NotFoundException);
  });
});
