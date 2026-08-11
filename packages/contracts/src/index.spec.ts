import { describe, expect, it } from 'vitest';

import {
  createMemberRequestSchema,
  updateDonationRequestSchema,
} from './index.js';

describe('createMemberRequestSchema', () => {
  it('accepts a member without address information', () => {
    expect(
      createMemberRequestSchema.parse({
        addressLine1: '',
        addressLine2: '',
        city: '',
        fullName: 'Member without address',
        postalCode: '',
        region: '',
      }),
    ).toEqual({
      addressLine1: undefined,
      addressLine2: undefined,
      city: undefined,
      country: 'US',
      fullName: 'Member without address',
      postalCode: undefined,
      region: undefined,
      status: 'active',
    });
  });

  it('still validates address information when provided', () => {
    const result = createMemberRequestSchema.safeParse({
      fullName: 'Member with invalid address',
      postalCode: 'invalid',
    });

    expect(result.success).toBe(false);
  });
});

describe('updateDonationRequestSchema', () => {
  it('accepts a complete envelope update and normalizes empty notes', () => {
    expect(
      updateDonationRequestSchema.parse({
        amountCents: 12_345,
        memberId: null,
        notes: '',
        paymentMethod: 'card',
        receivedOn: '2026-08-11',
      }),
    ).toEqual({
      amountCents: 12_345,
      memberId: null,
      notes: undefined,
      paymentMethod: 'card',
      receivedOn: '2026-08-11',
    });
  });

  it('rejects invalid envelope updates', () => {
    expect(
      updateDonationRequestSchema.safeParse({
        amountCents: 0,
        memberId: null,
        paymentMethod: 'cash',
        receivedOn: '2026-08-11',
      }).success,
    ).toBe(false);
  });
});
