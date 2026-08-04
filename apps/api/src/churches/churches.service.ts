import { randomUUID } from 'node:crypto';

import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateChurchRequest } from '@uckg/contracts';
import { schema } from '@uckg/database';
import { and, asc, eq } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service.js';

const churchFields = {
  id: schema.churches.id,
  locale: schema.churches.locale,
  name: schema.churches.name,
  slug: schema.churches.slug,
  timezone: schema.churches.timezone,
};

@Injectable()
export class ChurchesService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  list() {
    return this.database.db
      .select(churchFields)
      .from(schema.churches)
      .where(eq(schema.churches.status, 'active'))
      .orderBy(asc(schema.churches.name), asc(schema.churches.id));
  }

  async create(input: CreateChurchRequest) {
    try {
      const [church] = await this.database.db
        .insert(schema.churches)
        .values({
          locale: 'en',
          name: input.name,
          slug: this.uniqueSlug(input.name),
          timezone: 'America/New_York',
        })
        .returning(churchFields);

      if (!church) {
        throw new Error('The church could not be created.');
      }

      return church;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException('Unable to generate a unique church slug.');
      }

      throw error;
    }
  }

  async update(id: string, input: CreateChurchRequest) {
    const [church] = await this.database.db
      .update(schema.churches)
      .set({ name: input.name, updatedAt: new Date() })
      .where(
        and(eq(schema.churches.id, id), eq(schema.churches.status, 'active')),
      )
      .returning(churchFields);

    if (!church) {
      throw new NotFoundException('Church not found.');
    }

    return church;
  }

  async delete(id: string) {
    return this.database.db.transaction(async (transaction) => {
      const activeChurches = await transaction
        .select({ id: schema.churches.id })
        .from(schema.churches)
        .where(eq(schema.churches.status, 'active'))
        .for('update');

      if (!activeChurches.some((church) => church.id === id)) {
        throw new NotFoundException('Church not found.');
      }

      if (activeChurches.length === 1) {
        throw new ConflictException(
          'The last active church cannot be deleted.',
        );
      }

      const [church] = await transaction
        .update(schema.churches)
        .set({ status: 'archived', updatedAt: new Date() })
        .where(
          and(eq(schema.churches.id, id), eq(schema.churches.status, 'active')),
        )
        .returning({ id: schema.churches.id });

      if (!church) {
        throw new NotFoundException('Church not found.');
      }

      return { deleted: true, id: church.id };
    });
  }

  private uniqueSlug(name: string): string {
    const base = name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);

    return `${base || 'church'}-${randomUUID()}`;
  }
}
