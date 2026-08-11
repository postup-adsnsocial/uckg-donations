import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
  type ChurchRole,
} from '@uckg/authorization';
import type {
  ChangePasswordRequest,
  UpdateProfileRequest,
} from '@uckg/contracts';
import { schema } from '@uckg/database';
import { and, eq, gt, sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service.js';
import type { AuthenticatedAdmin } from './auth.types.js';

const sessionDurationMilliseconds = 12 * 60 * 60 * 1000;

export interface LoginResult {
  expiresAt: Date;
  token: string;
  user: AuthenticatedAdmin;
}

export interface UserMembership {
  churchId: string;
  churchName: string;
  churchSlug: string;
  role: ChurchRole;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const [record] = await this.database.db
      .select()
      .from(schema.adminUsers)
      .where(
        and(
          sql`lower(${schema.adminUsers.email}) = ${normalizedEmail}`,
          eq(schema.adminUsers.status, 'active'),
        ),
      )
      .limit(1);

    if (!record || !(await verifyPassword(password, record.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + sessionDurationMilliseconds);

    await this.database.db.insert(schema.adminSessions).values({
      expiresAt,
      tokenHash: hashSessionToken(token),
      userId: record.id,
    });

    return {
      expiresAt,
      token,
      user: this.toAuthenticatedAdmin(record),
    };
  }

  async authenticate(token: string): Promise<AuthenticatedAdmin | null> {
    const [record] = await this.database.db
      .select({
        displayName: schema.adminUsers.displayName,
        email: schema.adminUsers.email,
        id: schema.adminUsers.id,
        isPlatformAdmin: schema.adminUsers.isPlatformAdmin,
        sessionId: schema.adminSessions.id,
      })
      .from(schema.adminSessions)
      .innerJoin(
        schema.adminUsers,
        eq(schema.adminSessions.userId, schema.adminUsers.id),
      )
      .where(
        and(
          eq(schema.adminSessions.tokenHash, hashSessionToken(token)),
          gt(schema.adminSessions.expiresAt, new Date()),
          eq(schema.adminUsers.status, 'active'),
        ),
      )
      .limit(1);

    if (!record) {
      return null;
    }

    await this.database.db
      .update(schema.adminSessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(schema.adminSessions.id, record.sessionId));

    return {
      displayName: record.displayName,
      email: record.email,
      id: record.id,
      isPlatformAdmin: record.isPlatformAdmin,
    };
  }

  async logout(token: string): Promise<void> {
    await this.database.db
      .delete(schema.adminSessions)
      .where(eq(schema.adminSessions.tokenHash, hashSessionToken(token)));
  }

  async listMemberships(userId: string): Promise<UserMembership[]> {
    return this.database.db
      .select({
        churchId: schema.churches.id,
        churchName: schema.churches.name,
        churchSlug: schema.churches.slug,
        role: schema.churchMemberships.role,
      })
      .from(schema.churchMemberships)
      .innerJoin(
        schema.churches,
        eq(schema.churchMemberships.churchId, schema.churches.id),
      )
      .where(
        and(
          eq(schema.churchMemberships.userId, userId),
          eq(schema.churchMemberships.status, 'active'),
          eq(schema.churches.status, 'active'),
        ),
      );
  }

  async updateProfile(userId: string, input: UpdateProfileRequest) {
    try {
      const [user] = await this.database.db
        .update(schema.adminUsers)
        .set({
          displayName: input.displayName,
          email: input.email,
          updatedAt: new Date(),
        })
        .where(eq(schema.adminUsers.id, userId))
        .returning({
          displayName: schema.adminUsers.displayName,
          email: schema.adminUsers.email,
          id: schema.adminUsers.id,
          isPlatformAdmin: schema.adminUsers.isPlatformAdmin,
        });

      if (!user) throw new NotFoundException('User not found.');
      return { user };
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException('This email address is already in use.');
      }
      throw error;
    }
  }

  async changePassword(userId: string, input: ChangePasswordRequest) {
    const [user] = await this.database.db
      .select({ passwordHash: schema.adminUsers.passwordHash })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, userId))
      .limit(1);

    if (
      !user ||
      !(await verifyPassword(input.currentPassword, user.passwordHash))
    ) {
      throw new UnauthorizedException('The current password is incorrect.');
    }

    await this.database.db.transaction(async (transaction) => {
      await transaction
        .update(schema.adminUsers)
        .set({
          passwordHash: await hashPassword(input.newPassword),
          updatedAt: new Date(),
        })
        .where(eq(schema.adminUsers.id, userId));
      await transaction
        .delete(schema.adminSessions)
        .where(eq(schema.adminSessions.userId, userId));
    });
  }

  private toAuthenticatedAdmin(
    record: typeof schema.adminUsers.$inferSelect,
  ): AuthenticatedAdmin {
    return {
      displayName: record.displayName,
      email: record.email,
      id: record.id,
      isPlatformAdmin: record.isPlatformAdmin,
    };
  }
}
