import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  createSessionToken,
  hashSessionToken,
  verifyPassword,
  type ChurchRole,
} from '@uckg/authorization';
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
          eq(schema.churches.status, 'active'),
        ),
      );
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
