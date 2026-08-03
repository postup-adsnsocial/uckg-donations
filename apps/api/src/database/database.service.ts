import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createDatabase, type Database } from '@uckg/database';
import type { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: Database;
  readonly pool: Pool;

  constructor() {
    const databaseUrl =
      process.env.DATABASE_URL ??
      'postgresql://uckg:uckg@localhost:5432/uckg_donations';
    const connection = createDatabase(databaseUrl);

    this.db = connection.database;
    this.pool = connection.pool;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
