import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateMemberRequest } from '@uckg/contracts';
import { schema } from '@uckg/database';
import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';

import {
  type TenantContext,
  TenantUnitOfWork,
} from '../database/tenant-unit-of-work.js';

const memberFields = {
  addressLine1: schema.members.addressLine1,
  addressLine2: schema.members.addressLine2,
  city: schema.members.city,
  country: schema.members.country,
  createdAt: schema.members.createdAt,
  email: schema.members.email,
  fullName: schema.members.fullName,
  id: schema.members.id,
  notes: schema.members.notes,
  phone: schema.members.phone,
  postalCode: schema.members.postalCode,
  region: schema.members.region,
  status: schema.members.status,
  updatedAt: schema.members.updatedAt,
};

@Injectable()
export class MembersService {
  constructor(
    @Inject(TenantUnitOfWork)
    private readonly tenantUnitOfWork: TenantUnitOfWork,
  ) {}

  async list(
    context: TenantContext,
    search = '',
    page = 1,
    status?: 'active' | 'inactive',
  ) {
    const pageSize = 20;
    const term = search.trim();
    const searchPredicate = term
      ? or(
          ilike(schema.members.fullName, `%${term}%`),
          ilike(schema.members.email, `%${term}%`),
          ilike(schema.members.phone, `%${term}%`),
        )
      : undefined;
    const predicate = and(
      eq(schema.members.churchId, context.churchId),
      status ? eq(schema.members.status, status) : undefined,
      searchPredicate,
    );

    return this.tenantUnitOfWork.run(context, async (transaction) => {
      const [items, totals] = await Promise.all([
        transaction
          .select(memberFields)
          .from(schema.members)
          .where(predicate)
          .orderBy(asc(schema.members.fullName), asc(schema.members.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        transaction
          .select({ total: sql<number>`count(*)::int` })
          .from(schema.members)
          .where(predicate),
      ]);

      return {
        items,
        page,
        pageSize,
        total: totals[0]?.total ?? 0,
      };
    });
  }

  async get(context: TenantContext, id: string) {
    const member = await this.tenantUnitOfWork.run(
      context,
      async (transaction) => {
        const [found] = await transaction
          .select(memberFields)
          .from(schema.members)
          .where(
            and(
              eq(schema.members.churchId, context.churchId),
              eq(schema.members.id, id),
            ),
          )
          .limit(1);
        return found;
      },
    );

    if (!member) throw new NotFoundException('Member not found.');
    return member;
  }

  async create(context: TenantContext, input: CreateMemberRequest) {
    try {
      return await this.tenantUnitOfWork.run(context, async (transaction) => {
        const [member] = await transaction
          .insert(schema.members)
          .values({
            ...this.values(input),
            churchId: context.churchId,
          })
          .returning(memberFields);

        if (!member) throw new Error('The member could not be created.');
        return member;
      });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async update(context: TenantContext, id: string, input: CreateMemberRequest) {
    try {
      const member = await this.tenantUnitOfWork.run(
        context,
        async (transaction) => {
          const [updated] = await transaction
            .update(schema.members)
            .set({ ...this.values(input), updatedAt: new Date() })
            .where(
              and(
                eq(schema.members.churchId, context.churchId),
                eq(schema.members.id, id),
              ),
            )
            .returning(memberFields);
          return updated;
        },
      );

      if (!member) throw new NotFoundException('Member not found.');
      return member;
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  private values(input: CreateMemberRequest) {
    return {
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 ?? null,
      city: input.city,
      country: input.country,
      email: input.email ?? null,
      fullName: input.fullName,
      notes: input.notes ?? null,
      phone: input.phone ?? null,
      postalCode: input.postalCode,
      region: input.region,
      status: input.status,
    };
  }

  private rethrowConflict(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    ) {
      throw new ConflictException(
        'A member with this email already exists in the selected church.',
      );
    }
    throw error;
  }
}
