import { describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../database/database.service.js';
import { UsersService } from './users.service.js';

describe('UsersService tenant account lifecycle', () => {
  it('reactivates only the membership in the selected church', async () => {
    const membership = {
      createdAt: new Date('2026-08-10T00:00:00.000Z'),
      displayName: 'Shared Administrator',
      email: 'shared@example.com',
      id: 'membership-a',
      role: 'church_admin' as const,
      status: 'disabled' as const,
    };
    const selectLimit = vi.fn().mockResolvedValue([membership]);
    const selectWhere = vi.fn().mockReturnValue({ limit: selectLimit });
    const innerJoin = vi.fn().mockReturnValue({ where: selectWhere });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const returning = vi
      .fn()
      .mockResolvedValue([{ role: 'church_admin', status: 'active' }]);
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
    const service = new UsersService(database);

    await expect(
      service.update('church-a', 'actor-a', 'user-a', {
        role: 'church_admin',
        status: 'active',
      }),
    ).resolves.toMatchObject({
      id: 'user-a',
      role: 'church_admin',
      status: 'active',
    });

    expect(transaction.update).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith({
      role: 'church_admin',
      status: 'active',
      updatedAt: expect.any(Date),
    });
  });
});
