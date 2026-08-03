import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('verifies the correct password and rejects a different password', async () => {
    const hash = await hashPassword('a-local-password-with-entropy');

    await expect(
      verifyPassword('a-local-password-with-entropy', hash),
    ).resolves.toBe(true);
    await expect(verifyPassword('a-different-password', hash)).resolves.toBe(
      false,
    );
  });

  it('rejects passwords below the minimum length', async () => {
    await expect(hashPassword('too-short')).rejects.toThrow(
      'between 12 and 128',
    );
  });
});
