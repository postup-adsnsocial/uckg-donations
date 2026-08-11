import { Inject, Injectable } from '@nestjs/common';
import { schema } from '@uckg/database';
import { and, eq } from 'drizzle-orm';

import type { AuthenticatedAdmin, TenantContext } from '../auth/auth.types.js';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class TenantService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async resolve(
    user: AuthenticatedAdmin,
    churchId: string,
  ): Promise<TenantContext | null> {
    if (user.isPlatformAdmin) {
      const [church] = await this.database.db
        .select({
          id: schema.churches.id,
          locale: schema.churches.locale,
          name: schema.churches.name,
          slug: schema.churches.slug,
          timezone: schema.churches.timezone,
        })
        .from(schema.churches)
        .where(
          and(
            eq(schema.churches.id, churchId),
            eq(schema.churches.status, 'active'),
          ),
        )
        .limit(1);

      return church ? { church, role: null } : null;
    }

    const [membership] = await this.database.db
      .select({
        church: {
          id: schema.churches.id,
          locale: schema.churches.locale,
          name: schema.churches.name,
          slug: schema.churches.slug,
          timezone: schema.churches.timezone,
        },
        role: schema.churchMemberships.role,
      })
      .from(schema.churchMemberships)
      .innerJoin(
        schema.churches,
        eq(schema.churchMemberships.churchId, schema.churches.id),
      )
      .where(
        and(
          eq(schema.churchMemberships.userId, user.id),
          eq(schema.churchMemberships.churchId, churchId),
          eq(schema.churchMemberships.status, 'active'),
          eq(schema.churches.status, 'active'),
        ),
      )
      .limit(1);

    return membership ?? null;
  }
}
