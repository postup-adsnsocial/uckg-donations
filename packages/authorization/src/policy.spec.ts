import { describe, expect, it } from 'vitest';

import { hasPermission } from './policy.js';

describe('tenant permissions', () => {
  it('allows platform administrators to perform any tenant permission', () => {
    expect(
      hasPermission({ isPlatformAdmin: true, role: null }, 'membership:manage'),
    ).toBe(true);
  });

  it('does not let auditors write financial data', () => {
    expect(
      hasPermission(
        { isPlatformAdmin: false, role: 'auditor' },
        'finance:write',
      ),
    ).toBe(false);
  });

  it('lets church administrators manage memberships', () => {
    expect(
      hasPermission(
        { isPlatformAdmin: false, role: 'church_admin' },
        'membership:manage',
      ),
    ).toBe(true);
  });
});
