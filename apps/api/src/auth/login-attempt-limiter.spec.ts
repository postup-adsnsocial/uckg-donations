import { HttpException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiConfigService } from '../config/api-config.service.js';
import { LoginAttemptLimiter } from './login-attempt-limiter.js';

const configService = {
  values: {
    loginAccountLimit: 2,
    loginAccountWindowMs: 60_000,
    loginSourceLimit: 3,
    loginSourceWindowMs: 60_000,
  },
} as ApiConfigService;

describe('LoginAttemptLimiter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('blocks an account after the configured number of failures', () => {
    const limiter = new LoginAttemptLimiter(configService);

    limiter.recordFailure('203.0.113.10', 'user@example.com');
    limiter.recordFailure('203.0.113.11', 'USER@example.com');

    expect(() =>
      limiter.assertAllowed('203.0.113.12', 'user@example.com'),
    ).toThrow(HttpException);
  });

  it('blocks one source attempting different accounts', () => {
    const limiter = new LoginAttemptLimiter(configService);

    limiter.recordFailure('203.0.113.10', 'one@example.com');
    limiter.recordFailure('203.0.113.10', 'two@example.com');
    limiter.recordFailure('203.0.113.10', 'three@example.com');

    expect(() =>
      limiter.assertAllowed('203.0.113.10', 'four@example.com'),
    ).toThrow(HttpException);
  });

  it('clears account failures after a successful login', () => {
    const limiter = new LoginAttemptLimiter(configService);

    limiter.recordFailure('203.0.113.10', 'user@example.com');
    limiter.recordSuccess('user@example.com');

    expect(() =>
      limiter.assertAllowed('203.0.113.11', 'user@example.com'),
    ).not.toThrow();
  });

  it('allows attempts again after the window expires', () => {
    const limiter = new LoginAttemptLimiter(configService);

    limiter.recordFailure('203.0.113.10', 'user@example.com');
    limiter.recordFailure('203.0.113.11', 'user@example.com');
    vi.advanceTimersByTime(60_001);

    expect(() =>
      limiter.assertAllowed('203.0.113.12', 'user@example.com'),
    ).not.toThrow();
  });
});
