import { describe, expect, it } from 'vitest';

import { createMemberRequestSchema } from './index.js';

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
