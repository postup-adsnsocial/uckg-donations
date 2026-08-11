import { createHash } from 'node:crypto';

import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';

import { ApiConfigService } from '../config/api-config.service.js';

interface AttemptCounter {
  count: number;
  resetAt: number;
}

@Injectable()
export class LoginAttemptLimiter {
  private readonly accountAttempts = new Map<string, AttemptCounter>();
  private readonly sourceAttempts = new Map<string, AttemptCounter>();

  constructor(
    @Inject(ApiConfigService) private readonly configService: ApiConfigService,
  ) {}

  assertAllowed(source: string, email: string): void {
    const config = this.configService.values;
    const now = Date.now();
    const sourceCounter = this.current(
      this.sourceAttempts,
      this.key(source),
      config.loginSourceWindowMs,
      now,
    );
    const accountCounter = this.current(
      this.accountAttempts,
      this.key(email.trim().toLowerCase()),
      config.loginAccountWindowMs,
      now,
    );

    if (
      sourceCounter.count >= config.loginSourceLimit ||
      accountCounter.count >= config.loginAccountLimit
    ) {
      const retryAt = Math.max(sourceCounter.resetAt, accountCounter.resetAt);
      throw new HttpException(
        {
          message: 'Too many login attempts. Try again later.',
          retryAfterSeconds: Math.max(1, Math.ceil((retryAt - now) / 1000)),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  recordFailure(source: string, email: string): void {
    const config = this.configService.values;
    const now = Date.now();
    this.increment(
      this.sourceAttempts,
      this.key(source),
      config.loginSourceWindowMs,
      now,
    );
    this.increment(
      this.accountAttempts,
      this.key(email.trim().toLowerCase()),
      config.loginAccountWindowMs,
      now,
    );
  }

  recordSuccess(email: string): void {
    this.accountAttempts.delete(this.key(email.trim().toLowerCase()));
  }

  private current(
    counters: Map<string, AttemptCounter>,
    key: string,
    windowMs: number,
    now: number,
  ): AttemptCounter {
    const counter = counters.get(key);
    if (counter && counter.resetAt > now) return counter;

    const fresh = { count: 0, resetAt: now + windowMs };
    counters.set(key, fresh);
    return fresh;
  }

  private increment(
    counters: Map<string, AttemptCounter>,
    key: string,
    windowMs: number,
    now: number,
  ): void {
    const counter = this.current(counters, key, windowMs, now);
    counter.count += 1;
  }

  private key(value: string): string {
    return createHash('sha256')
      .update(value.trim() || 'unknown', 'utf8')
      .digest('hex');
  }
}
