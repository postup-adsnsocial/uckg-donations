import { describe, expect, it } from 'vitest';

import { validateApiEnvironment } from './api-config.js';

const productionEnvironment = {
  NODE_ENV: 'production',
  API_PORT: '3001',
  DATABASE_URL: 'postgresql://runtime-user:runtime-password@db.example.com:5432/uckg',
  WEB_ORIGINS: 'https://admin.example.com,https://ops.example.com',
  TRUST_PROXY: '10.0.0.0/8,172.16.0.0/12',
  METRICS_TOKEN: 'metrics-token-with-at-least-32-characters',
  BODY_LIMIT: '256kb',
  DB_POOL_MAX: '10',
  DB_CONNECTION_TIMEOUT_MS: '5000',
  DB_IDLE_TIMEOUT_MS: '30000',
  DB_STATEMENT_TIMEOUT_MS: '15000',
  DB_READY_TIMEOUT_MS: '1000',
  LOGIN_SOURCE_LIMIT: '10',
  LOGIN_SOURCE_WINDOW_MS: '60000',
  LOGIN_ACCOUNT_LIMIT: '5',
  LOGIN_ACCOUNT_WINDOW_MS: '900000',
} as const;

describe('validateApiEnvironment', () => {
  it('applies conservative defaults outside production', () => {
    expect(validateApiEnvironment({ NODE_ENV: 'test' })).toEqual({
      nodeEnv: 'test',
      apiPort: 3001,
      databaseUrl: 'postgresql://uckg:uckg@localhost:5432/uckg_donations',
      webOrigins: ['http://localhost:3000'],
      trustProxy: false,
      metricsToken: 'development-metrics-token',
      bodyLimit: '256kb',
      dbPoolMax: 10,
      dbConnectionTimeoutMs: 5000,
      dbIdleTimeoutMs: 30000,
      dbStatementTimeoutMs: 15000,
      dbReadyTimeoutMs: 1000,
      loginSourceLimit: 10,
      loginSourceWindowMs: 60_000,
      loginAccountLimit: 5,
      loginAccountWindowMs: 900_000,
    });
  });

  it.each([
    'API_PORT',
    'DATABASE_URL',
    'WEB_ORIGINS',
    'TRUST_PROXY',
    'METRICS_TOKEN',
    'BODY_LIMIT',
    'DB_POOL_MAX',
    'DB_CONNECTION_TIMEOUT_MS',
    'DB_IDLE_TIMEOUT_MS',
    'DB_STATEMENT_TIMEOUT_MS',
    'DB_READY_TIMEOUT_MS',
    'LOGIN_SOURCE_LIMIT',
    'LOGIN_SOURCE_WINDOW_MS',
    'LOGIN_ACCOUNT_LIMIT',
    'LOGIN_ACCOUNT_WINDOW_MS',
  ])('rejects production when %s is missing', (key) => {
    const environment: Record<string, unknown> = { ...productionEnvironment };
    delete environment[key];

    expect(() => validateApiEnvironment(environment)).toThrow(key);
  });

  it.each([
    ['DATABASE_URL', 'postgresql://runtime:password@localhost:5432/uckg'],
    ['DATABASE_URL', 'postgresql://runtime:password@127.0.0.1:5432/uckg'],
    ['WEB_ORIGINS', '*'],
    ['WEB_ORIGINS', 'http://localhost:3000'],
    ['WEB_ORIGINS', 'https://admin.example.com,*'],
    ['TRUST_PROXY', 'true'],
    ['TRUST_PROXY', ''],
  ])('rejects insecure production %s=%s', (key, value) => {
    expect(() =>
      validateApiEnvironment({ ...productionEnvironment, [key]: value }),
    ).toThrow(key);
  });

  it('returns parsed production values', () => {
    expect(validateApiEnvironment(productionEnvironment)).toMatchObject({
      nodeEnv: 'production',
      apiPort: 3001,
      webOrigins: ['https://admin.example.com', 'https://ops.example.com'],
      trustProxy: ['10.0.0.0/8', '172.16.0.0/12'],
      bodyLimit: '256kb',
      dbPoolMax: 10,
      dbConnectionTimeoutMs: 5000,
      dbIdleTimeoutMs: 30_000,
      dbStatementTimeoutMs: 15_000,
      dbReadyTimeoutMs: 1_000,
      loginSourceLimit: 10,
      loginSourceWindowMs: 60_000,
      loginAccountLimit: 5,
      loginAccountWindowMs: 900_000,
    });
  });

  it('reports configuration keys without leaking secret values', () => {
    const secretCanary = 'secret-canary-that-must-never-be-reported';

    try {
      validateApiEnvironment({
        ...productionEnvironment,
        DATABASE_URL: secretCanary,
        METRICS_TOKEN: secretCanary,
      });
      throw new Error('Expected environment validation to fail');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain('DATABASE_URL');
      expect(message).not.toContain(secretCanary);
    }
  });
});
