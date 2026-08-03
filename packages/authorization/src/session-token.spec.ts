import { describe, expect, it } from 'vitest';

import { createSessionToken, hashSessionToken } from './session-token.js';

describe('session tokens', () => {
  it('creates opaque tokens and stores only a deterministic hash', () => {
    const firstToken = createSessionToken();
    const secondToken = createSessionToken();

    expect(firstToken).not.toBe(secondToken);
    expect(hashSessionToken(firstToken)).toHaveLength(64);
    expect(hashSessionToken(firstToken)).toBe(hashSessionToken(firstToken));
    expect(hashSessionToken(firstToken)).not.toContain(firstToken);
  });
});
