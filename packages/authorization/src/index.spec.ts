import { describe, expect, it } from 'vitest';

import { belongsToChurch } from './index.js';

describe('belongsToChurch', () => {
  it('denies access to a different church', () => {
    expect(
      belongsToChurch(
        {
          churchId: 'church-a',
          roles: ['church_admin'],
          userId: 'user-1',
        },
        'church-b',
      ),
    ).toBe(false);
  });
});
