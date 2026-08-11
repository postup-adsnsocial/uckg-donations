import type { UpdateDonationRequest } from '@uckg/contracts';
import { describe, expect, it, vi } from 'vitest';

import type {
  TenantContext,
  TenantTransaction,
} from '../database/tenant-unit-of-work.js';
import { DonationsService } from './donations.service.js';

const context: TenantContext = {
  actorId: '4cf89a1e-c906-41e3-bd45-eecb6d1f70b7',
  churchId: '7946ce5a-e1fe-493a-bd8c-b9ca848efc3e',
  correlationId: '801696e2-ed86-4746-bc05-499dfb75d903',
};

describe('DonationsService envelope updates', () => {
  it('updates through the tenant transaction with an explicit predicate', async () => {
    const donationId = '2edd561c-3a34-4927-a406-cc2fcf345989';
    const returning = vi.fn().mockResolvedValue([{ id: donationId }]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const transaction = {
      update: vi.fn().mockReturnValue({ set }),
    } as unknown as TenantTransaction;
    const unitOfWork = {
      run: vi.fn(
        async (
          receivedContext: TenantContext,
          work: (tx: TenantTransaction) => Promise<unknown>,
        ) => work(transaction),
      ),
    };
    const service = new DonationsService(unitOfWork as never, {} as never);
    const input: UpdateDonationRequest = {
      amountCents: 12_345,
      memberId: null,
      notes: 'Updated notes',
      paymentMethod: 'card',
      receivedOn: '2026-08-11',
    };

    await expect(service.update(context, donationId, input)).resolves.toEqual({
      id: donationId,
    });

    expect(unitOfWork.run).toHaveBeenCalledWith(context, expect.any(Function));
    expect(set).toHaveBeenCalledWith({
      amountCents: input.amountCents,
      memberId: null,
      notes: input.notes,
      paymentMethod: input.paymentMethod,
      receivedOn: input.receivedOn,
    });
    expect(where).toHaveBeenCalledOnce();
  });
});
