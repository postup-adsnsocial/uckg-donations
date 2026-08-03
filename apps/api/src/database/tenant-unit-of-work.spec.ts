import { describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from './database.service.js';
import {
  TenantUnitOfWork,
  type TenantContext,
  type TenantTransaction,
} from './tenant-unit-of-work.js';

function createSubject() {
  const transaction = {
    execute: vi.fn().mockResolvedValue(undefined),
  } as unknown as TenantTransaction;
  const database = {
    db: {
      transaction: vi.fn(
        async (callback: (tx: TenantTransaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    },
  } as unknown as DatabaseService;

  return {
    database,
    subject: new TenantUnitOfWork(database),
    transaction,
  };
}

describe('TenantUnitOfWork', () => {
  it('sets tenant context locally and passes the same transaction to work', async () => {
    const { database, subject, transaction } = createSubject();
    const context: TenantContext = {
      actorId: '4cf89a1e-c906-41e3-bd45-eecb6d1f70b7',
      churchId: '7946ce5a-e1fe-493a-bd8c-b9ca848efc3e',
      correlationId: '801696e2-ed86-4746-bc05-499dfb75d903',
    };
    const work = vi.fn().mockResolvedValue('completed');

    await expect(subject.run(context, work)).resolves.toBe('completed');

    expect(database.db.transaction).toHaveBeenCalledTimes(1);
    expect(transaction.execute).toHaveBeenCalledTimes(1);
    expect(work).toHaveBeenCalledOnce();
    expect(work).toHaveBeenCalledWith(transaction);

    const query = vi.mocked(transaction.execute).mock.calls[0]?.[0] as {
      queryChunks?: readonly unknown[];
    };
    expect(JSON.stringify(query.queryChunks)).toContain(
      'app.current_church_id',
    );
    expect(JSON.stringify(query.queryChunks)).toContain('app.current_actor_id');
    expect(JSON.stringify(query.queryChunks)).toContain('app.correlation_id');
    expect(JSON.stringify(query.queryChunks)).not.toContain('sql.raw');
  });

  it.each([
    ['context', undefined],
    ['churchId', { actorId: 'actor', correlationId: 'correlation' }],
    ['actorId', { churchId: 'church', correlationId: 'correlation' }],
    ['correlationId', { actorId: 'actor', churchId: 'church' }],
  ])('rejects missing %s before opening a transaction', async (_field, value) => {
    const { database, subject } = createSubject();
    const work = vi.fn();

    await expect(
      subject.run(value as TenantContext, work),
    ).rejects.toThrow('Tenant context requires churchId, actorId, and correlationId.');
    expect(database.db.transaction).not.toHaveBeenCalled();
    expect(work).not.toHaveBeenCalled();
  });
});
