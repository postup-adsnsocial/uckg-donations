import { Inject, Injectable } from '@nestjs/common';
import type { Database } from '@uckg/database';
import { sql } from 'drizzle-orm';

import { DatabaseService } from './database.service.js';

export interface TenantContext {
  readonly actorId: string;
  readonly churchId: string;
  readonly correlationId: string;
}

type TransactionCallback = Parameters<Database['transaction']>[0];

export type TenantTransaction = Parameters<TransactionCallback>[0];

@Injectable()
export class TenantUnitOfWork {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async run<T>(
    context: TenantContext,
    work: (transaction: TenantTransaction) => Promise<T>,
  ): Promise<T> {
    this.assertContext(context);

    return this.database.db.transaction(async (transaction) => {
      const tenantSettings = sql`
        select
          set_config('app.current_church_id', ${context.churchId}, true),
          set_config('app.current_actor_id', ${context.actorId}, true),
          set_config('app.correlation_id', ${context.correlationId}, true)
      ` as unknown as Parameters<typeof transaction.execute>[0];

      await transaction.execute(tenantSettings);

      return work(transaction);
    });
  }

  private assertContext(context: TenantContext): void {
    if (
      !context ||
      typeof context.churchId !== 'string' ||
      context.churchId.trim().length === 0 ||
      typeof context.actorId !== 'string' ||
      context.actorId.trim().length === 0 ||
      typeof context.correlationId !== 'string' ||
      context.correlationId.trim().length === 0
    ) {
      throw new TypeError(
        'Tenant context requires churchId, actorId, and correlationId.',
      );
    }
  }
}
