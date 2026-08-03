import { describe, expect, it } from 'vitest';

import type { ApiConfigService } from '../config/api-config.service.js';
import { DatabaseService } from './database.service.js';

describe('DatabaseService', () => {
  it('constructs a bounded runtime pool from validated API configuration', async () => {
    const config = {
      values: {
        nodeEnv: 'test',
        apiPort: 3001,
        databaseUrl: 'postgresql://runtime:password@db.example.com:5432/uckg',
        webOrigins: ['http://localhost:3000'],
        trustProxy: false,
        metricsToken: 'test-token',
        bodyLimit: '256kb',
        dbPoolMax: 3,
        dbConnectionTimeoutMs: 4_321,
        dbIdleTimeoutMs: 23_456,
        dbStatementTimeoutMs: 12_345,
        dbReadyTimeoutMs: 999,
        loginSourceLimit: 10,
        loginSourceWindowMs: 60_000,
        loginAccountLimit: 5,
        loginAccountWindowMs: 900_000,
      },
    } satisfies Pick<ApiConfigService, 'values'>;

    const service = Reflect.construct(DatabaseService, [config]) as DatabaseService;

    expect(service.pool.options).toMatchObject({
      application_name: 'uckg-api',
      connectionString: config.values.databaseUrl,
      connectionTimeoutMillis: 4_321,
      idleTimeoutMillis: 23_456,
      max: 3,
      query_timeout: 12_345,
      statement_timeout: 12_345,
    });

    await service.onModuleDestroy();
  });
});
