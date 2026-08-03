import type { CreateMemberRequest } from '@uckg/contracts';
import { describe, expect, it, vi } from 'vitest';

import type {
  TenantContext,
  TenantTransaction,
} from '../database/tenant-unit-of-work.js';
import { MembersService } from './members.service.js';

const context: TenantContext = {
  actorId: '4cf89a1e-c906-41e3-bd45-eecb6d1f70b7',
  churchId: '7946ce5a-e1fe-493a-bd8c-b9ca848efc3e',
  correlationId: '801696e2-ed86-4746-bc05-499dfb75d903',
};

describe('MembersService tenant boundary', () => {
  it('lists members through the tenant transaction with an explicit predicate', async () => {
    const rows = [{ fullName: 'Member A', id: 'member-a' }];
    const offset = vi.fn().mockResolvedValue(rows);
    const limit = vi.fn().mockReturnValue({ offset });
    const orderBy = vi.fn().mockReturnValue({ limit });
    const itemWhere = vi.fn().mockReturnValue({ orderBy });
    const totalWhere = vi.fn().mockResolvedValue([{ total: 1 }]);
    const itemFrom = vi.fn().mockReturnValue({ where: itemWhere });
    const totalFrom = vi.fn().mockReturnValue({ where: totalWhere });
    const transaction = {
      select: vi
        .fn()
        .mockReturnValueOnce({ from: itemFrom })
        .mockReturnValueOnce({ from: totalFrom }),
    } as unknown as TenantTransaction;
    const unitOfWork = {
      run: vi.fn(
        async (
          receivedContext: TenantContext,
          work: (tx: TenantTransaction) => Promise<unknown>,
        ) => work(transaction),
      ),
    };
    const service = new MembersService(unitOfWork as never);

    await expect(service.list(context)).resolves.toEqual({
      items: rows,
      page: 1,
      pageSize: 20,
      total: 1,
    });

    expect(unitOfWork.run).toHaveBeenCalledWith(context, expect.any(Function));
    expect(transaction.select).toHaveBeenCalledTimes(2);
    expect(itemWhere).toHaveBeenCalledOnce();
    expect(orderBy).toHaveBeenCalledOnce();
  });

  it('creates a member through the tenant transaction using context.churchId', async () => {
    const member = { fullName: 'Member A', id: 'member-a' };
    const returning = vi.fn().mockResolvedValue([member]);
    const values = vi.fn().mockReturnValue({ returning });
    const transaction = {
      insert: vi.fn().mockReturnValue({ values }),
    } as unknown as TenantTransaction;
    const unitOfWork = {
      run: vi.fn(
        async (
          receivedContext: TenantContext,
          work: (tx: TenantTransaction) => Promise<unknown>,
        ) => work(transaction),
      ),
    };
    const service = new MembersService(unitOfWork as never);
    const input: CreateMemberRequest = {
      addressLine1: '123 Main St',
      city: 'New York',
      country: 'US',
      email: 'member@example.com',
      fullName: 'Member A',
      phone: '+15555550100',
      postalCode: '10001',
      region: 'NY',
      status: 'active',
    };

    await expect(service.create(context, input)).resolves.toBe(member);

    expect(unitOfWork.run).toHaveBeenCalledWith(context, expect.any(Function));
    expect(values).toHaveBeenCalledWith({
      churchId: context.churchId,
      addressLine1: input.addressLine1,
      addressLine2: null,
      city: input.city,
      country: input.country,
      email: input.email,
      fullName: input.fullName,
      notes: null,
      phone: input.phone,
      postalCode: input.postalCode,
      region: input.region,
      status: input.status,
    });
  });
});
