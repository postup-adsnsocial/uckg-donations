import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { createDatabase, type Database } from '@uckg/database';
import type { Pool } from 'pg';

import { ApiConfigService } from '../config/api-config.service.js';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: Database;
  readonly pool: Pool;

  constructor(@Inject(ApiConfigService) configService: ApiConfigService) {
    const config = configService.values;
    const connection = createDatabase(config.databaseUrl, {
      applicationName: 'uckg-api',
      connectionTimeoutMs: config.dbConnectionTimeoutMs,
      idleTimeoutMs: config.dbIdleTimeoutMs,
      max: config.dbPoolMax,
      statementTimeoutMs: config.dbStatementTimeoutMs,
    });

    this.db = connection.database;
    this.pool = connection.pool;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
