import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { CreateMemberRequest } from '@uckg/contracts';
import { schema } from '@uckg/database';
import { and, asc, eq } from 'drizzle-orm';

import {
  type TenantContext,
  TenantUnitOfWork,
} from '../database/tenant-unit-of-work.js';

@Injectable()
export class MembersService {
  constructor(
    @Inject(TenantUnitOfWork)
    private readonly tenantUnitOfWork: TenantUnitOfWork,
  ) {}

  async list(context: TenantContext) {
    return this.tenantUnitOfWork.run(context, (transaction) =>
      transaction
        .select({
          createdAt: schema.members.createdAt,
          email: schema.members.email,
          fullName: schema.members.fullName,
          id: schema.members.id,
          phone: schema.members.phone,
          status: schema.members.status,
        })
        .from(schema.members)
        .where(eq(schema.members.churchId, context.churchId))
        .orderBy(asc(schema.members.fullName), asc(schema.members.id)),
    );
  }

  async create(context: TenantContext, input: CreateMemberRequest) {
    try {
      return await this.tenantUnitOfWork.run(context, async (transaction) => {
        const [member] = await transaction
          .insert(schema.members)
          .values({
            churchId: context.churchId,
            email: input.email ?? null,
            fullName: input.fullName,
            phone: input.phone ?? null,
          })
          .returning({
            createdAt: schema.members.createdAt,
            email: schema.members.email,
            fullName: schema.members.fullName,
            id: schema.members.id,
            phone: schema.members.phone,
            status: schema.members.status,
          });

        if (!member) {
          throw new Error('The member could not be created.');
        }

        return member;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'A member with this email already exists in the selected church.',
        );
      }

      throw error;
    }
  }

  private isUniqueViolation(error: unknown): error is { code: '23505' } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }
}
