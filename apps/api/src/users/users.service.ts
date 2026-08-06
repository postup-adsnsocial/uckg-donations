import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hashPassword } from '@uckg/authorization';
import type {
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
} from '@uckg/contracts';
import { schema } from '@uckg/database';
import { and, asc, eq, sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service.js';

const userFields = {
  createdAt: schema.adminUsers.createdAt,
  displayName: schema.adminUsers.displayName,
  email: schema.adminUsers.email,
  id: schema.adminUsers.id,
  role: schema.churchMemberships.role,
  status: schema.adminUsers.status,
};

@Injectable()
export class UsersService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  list(churchId: string) {
    return this.database.db
      .select(userFields)
      .from(schema.churchMemberships)
      .innerJoin(
        schema.adminUsers,
        eq(schema.churchMemberships.userId, schema.adminUsers.id),
      )
      .where(eq(schema.churchMemberships.churchId, churchId))
      .orderBy(
        asc(schema.adminUsers.displayName),
        asc(schema.adminUsers.email),
      );
  }

  async create(churchId: string, input: CreateAdminUserRequest) {
    try {
      return await this.database.db.transaction(async (transaction) => {
        const [existingUser] = await transaction
          .select({ id: schema.adminUsers.id })
          .from(schema.adminUsers)
          .where(sql`lower(${schema.adminUsers.email}) = ${input.email}`)
          .limit(1);

        if (existingUser) {
          throw new ConflictException(
            'A user with this email address already exists.',
          );
        }

        const [user] = await transaction
          .insert(schema.adminUsers)
          .values({
            displayName: input.displayName,
            email: input.email,
            passwordHash: await hashPassword(input.password),
          })
          .returning({
            createdAt: schema.adminUsers.createdAt,
            displayName: schema.adminUsers.displayName,
            email: schema.adminUsers.email,
            id: schema.adminUsers.id,
          });

        if (!user) throw new Error('The user could not be created.');

        const [membership] = await transaction
          .insert(schema.churchMemberships)
          .values({ churchId, role: input.role, userId: user.id })
          .returning({
            role: schema.churchMemberships.role,
          });

        if (!membership)
          throw new Error('The membership could not be created.');

        return { ...user, ...membership, status: 'active' as const };
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException(
          'A user with this email address already exists.',
        );
      }
      throw error;
    }
  }

  async update(
    churchId: string,
    actorId: string,
    userId: string,
    input: UpdateAdminUserRequest,
  ) {
    return this.database.db.transaction(async (transaction) => {
      const [membership] = await transaction
        .select({
          createdAt: schema.adminUsers.createdAt,
          displayName: schema.adminUsers.displayName,
          email: schema.adminUsers.email,
          id: schema.churchMemberships.id,
          role: schema.churchMemberships.role,
          status: schema.adminUsers.status,
        })
        .from(schema.churchMemberships)
        .innerJoin(
          schema.adminUsers,
          eq(schema.churchMemberships.userId, schema.adminUsers.id),
        )
        .where(
          and(
            eq(schema.churchMemberships.churchId, churchId),
            eq(schema.churchMemberships.userId, userId),
          ),
        )
        .limit(1);

      if (!membership) throw new NotFoundException('User not found.');

      const removesAdminAccess =
        input.role !== 'church_admin' || input.status !== 'active';

      if (userId === actorId && removesAdminAccess) {
        throw new ConflictException(
          'You cannot remove your own administrator access.',
        );
      }

      if (
        membership.role === 'church_admin' &&
        membership.status === 'active' &&
        removesAdminAccess
      ) {
        const activeAdministrators = await transaction
          .select({ id: schema.churchMemberships.id })
          .from(schema.churchMemberships)
          .innerJoin(
            schema.adminUsers,
            eq(schema.churchMemberships.userId, schema.adminUsers.id),
          )
          .where(
            and(
              eq(schema.churchMemberships.churchId, churchId),
              eq(schema.churchMemberships.role, 'church_admin'),
              eq(schema.adminUsers.status, 'active'),
            ),
          )
          .for('update');

        if (activeAdministrators.length === 1) {
          throw new ConflictException(
            'The last active church administrator cannot be changed.',
          );
        }
      }

      const [updated] = await transaction
        .update(schema.churchMemberships)
        .set({
          role: input.role,
          updatedAt: new Date(),
        })
        .where(eq(schema.churchMemberships.id, membership.id))
        .returning({
          role: schema.churchMemberships.role,
        });

      if (!updated) throw new NotFoundException('User not found.');

      await transaction
        .update(schema.adminUsers)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(schema.adminUsers.id, userId));

      return {
        createdAt: membership.createdAt,
        displayName: membership.displayName,
        email: membership.email,
        id: userId,
        ...updated,
        status: input.status,
      };
    });
  }
}
