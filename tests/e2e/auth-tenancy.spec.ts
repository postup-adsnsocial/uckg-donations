import { hashPassword } from '@uckg/authorization';
import { createDatabase, schema } from '@uckg/database';
import { eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

const databaseUrl =
  process.env.MIGRATION_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://uckg:uckg@localhost:5432/uckg_donations';
const connection = createDatabase(databaseUrl);
const apiBaseUrl = process.env.E2E_API_URL ?? 'http://localhost:3001';
const suffix = randomUUID().slice(0, 8);
const email = `e2e-auditor-${suffix}@example.com`;
const password = `e2e-password-${suffix}-secure`;
const platformEmail = `e2e-platform-${suffix}@example.com`;
const platformPassword = `e2e-platform-password-${suffix}-secure`;
let churchAId = '';
let churchBId = '';
let createdChurchId = '';
let inactiveChurchId = '';
let platformUserId = '';
let userId = '';

test.describe('administrative authentication and tenant isolation', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const [churchA, churchB, inactiveChurch] = await connection.database
      .insert(schema.churches)
      .values([
        { name: `E2E Church A ${suffix}`, slug: `e2e-church-a-${suffix}` },
        { name: `E2E Church B ${suffix}`, slug: `e2e-church-b-${suffix}` },
        {
          name: `E2E Inactive Church ${suffix}`,
          slug: `e2e-inactive-church-${suffix}`,
          status: 'suspended',
        },
      ])
      .returning({ id: schema.churches.id });

    const [user, platformUser] = await connection.database
      .insert(schema.adminUsers)
      .values([
        {
          displayName: 'E2E Auditor',
          email,
          passwordHash: await hashPassword(password),
        },
        {
          displayName: 'E2E Platform Administrator',
          email: platformEmail,
          isPlatformAdmin: true,
          passwordHash: await hashPassword(platformPassword),
        },
      ])
      .returning({ id: schema.adminUsers.id });

    if (!churchA || !churchB || !inactiveChurch || !user || !platformUser) {
      throw new Error('Unable to prepare the E2E tenant fixtures.');
    }

    churchAId = churchA.id;
    churchBId = churchB.id;
    inactiveChurchId = inactiveChurch.id;
    platformUserId = platformUser.id;
    userId = user.id;

    await connection.database.insert(schema.churchMemberships).values({
      churchId: churchAId,
      role: 'auditor',
      userId,
    });
  });

  test.afterAll(async () => {
    const userIds = [userId, platformUserId].filter(Boolean);
    if (userIds.length) {
      await connection.database
        .delete(schema.adminUsers)
        .where(inArray(schema.adminUsers.id, userIds));
    }

    const churchIds = [
      churchAId,
      churchBId,
      createdChurchId,
      inactiveChurchId,
    ].filter(Boolean);
    if (churchIds.length) {
      await connection.database
        .delete(schema.churches)
        .where(inArray(schema.churches.id, churchIds));
    }

    await connection.pool.end();
  });

  test('returns 401 without a session', async ({ request }) => {
    const response = await request.get(`${apiBaseUrl}/auth/me`);

    expect(response.status()).toBe(401);

    expect((await request.get(`${apiBaseUrl}/churches`)).status()).toBe(401);
    expect(
      (
        await request.post(`${apiBaseUrl}/churches`, {
          data: { name: 'Unauthorized Church' },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await request.patch(`${apiBaseUrl}/churches/${churchAId}`, {
          data: { name: 'Unauthorized Update' },
        })
      ).status(),
    ).toBe(401);
    expect(
      (await request.delete(`${apiBaseUrl}/churches/${churchAId}`)).status(),
    ).toBe(401);
  });

  test('authenticates and denies cross-tenant and role escalation', async ({
    request,
  }) => {
    const login = await request.post(`${apiBaseUrl}/auth/login`, {
      data: { email, password },
    });

    expect(login.status()).toBe(201);
    expect(login.headers()['set-cookie']).toContain('HttpOnly');
    expect(login.headers()['set-cookie']).toContain('SameSite=Strict');

    const me = await request.get(`${apiBaseUrl}/auth/me`);
    expect(me.status()).toBe(200);
    await expect(me.json()).resolves.toMatchObject({
      memberships: [{ churchId: churchAId, role: 'auditor' }],
      user: { email },
    });

    expect((await request.get(`${apiBaseUrl}/churches`)).status()).toBe(403);
    expect(
      (
        await request.post(`${apiBaseUrl}/churches`, {
          data: { name: 'Forbidden Church' },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.patch(`${apiBaseUrl}/churches/${churchBId}`, {
          data: { name: 'Forbidden Update' },
        })
      ).status(),
    ).toBe(403);
    expect(
      (await request.delete(`${apiBaseUrl}/churches/${churchBId}`)).status(),
    ).toBe(403);

    const ownChurch = await request.get(`${apiBaseUrl}/churches/current`, {
      headers: { 'x-church-id': churchAId },
    });
    expect(ownChurch.status()).toBe(200);

    const otherChurch = await request.get(`${apiBaseUrl}/churches/current`, {
      headers: { 'x-church-id': churchBId },
    });
    expect(otherChurch.status()).toBe(403);

    const settings = await request.get(
      `${apiBaseUrl}/churches/current/settings`,
      {
        headers: { 'x-church-id': churchAId },
      },
    );
    expect(settings.status()).toBe(403);
  });

  test('lets a platform administrator create and list active churches', async ({
    request,
  }) => {
    const login = await request.post(`${apiBaseUrl}/auth/login`, {
      data: { email: platformEmail, password: platformPassword },
    });
    expect(login.status()).toBe(201);

    const invalid = await request.post(`${apiBaseUrl}/churches`, {
      data: { name: '', slug: 'client-controlled' },
    });
    expect(invalid.status()).toBe(400);

    const churchName = `E2E Created Church ${suffix}`;
    const created = await request.post(`${apiBaseUrl}/churches`, {
      data: { name: churchName },
    });
    expect(created.status()).toBe(201);
    const createdChurch = (await created.json()) as {
      id: string;
      locale: string;
      name: string;
      slug: string;
      timezone: string;
    };
    createdChurchId = createdChurch.id;
    expect(createdChurch).toMatchObject({
      locale: 'en',
      name: churchName,
      timezone: 'America/New_York',
    });
    expect(createdChurch.slug).toMatch(
      /^e2e-created-church-[a-z0-9]+-[0-9a-f-]{36}$/,
    );

    const updatedChurchName = `E2E Updated Church ${suffix}`;
    const updated = await request.patch(
      `${apiBaseUrl}/churches/${createdChurchId}`,
      { data: { name: updatedChurchName } },
    );
    expect(updated.status()).toBe(200);
    await expect(updated.json()).resolves.toMatchObject({
      id: createdChurchId,
      name: updatedChurchName,
      slug: createdChurch.slug,
    });

    const listed = await request.get(`${apiBaseUrl}/churches`);
    expect(listed.status()).toBe(200);
    const churches = (await listed.json()) as Array<{
      id: string;
      name: string;
    }>;
    expect(churches.find(({ id }) => id === createdChurchId)?.name).toBe(
      updatedChurchName,
    );
    expect(churches.find(({ id }) => id === inactiveChurchId)).toBeUndefined();
    const fixtureChurchNames = churches
      .filter(({ id }) => [churchAId, churchBId, createdChurchId].includes(id))
      .map(({ name }) => name);
    expect(fixtureChurchNames).toEqual(
      [...fixtureChurchNames].sort((left, right) => left.localeCompare(right)),
    );

    const createdMember = await request.post(`${apiBaseUrl}/members`, {
      data: { fullName: `E2E Created Member ${suffix}` },
      headers: { 'x-church-id': createdChurchId },
    });
    expect(createdMember.status()).toBe(201);
    const member = (await createdMember.json()) as { id: string };

    expect(
      (
        await request.get(`${apiBaseUrl}/members/${member.id}`, {
          headers: { 'x-church-id': churchAId },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await request.get(`${apiBaseUrl}/members/${member.id}`, {
          headers: { 'x-church-id': createdChurchId },
        })
      ).status(),
    ).toBe(200);

    const deleted = await request.delete(
      `${apiBaseUrl}/churches/${createdChurchId}`,
    );
    expect(deleted.status()).toBe(200);
    await expect(deleted.json()).resolves.toEqual({
      deleted: true,
      id: createdChurchId,
    });

    const listedAfterDelete = await request.get(`${apiBaseUrl}/churches`);
    const churchesAfterDelete = (await listedAfterDelete.json()) as Array<{
      id: string;
    }>;
    expect(churchesAfterDelete.some(({ id }) => id === createdChurchId)).toBe(
      false,
    );
    expect(
      (
        await request.get(`${apiBaseUrl}/churches/current`, {
          headers: { 'x-church-id': createdChurchId },
        })
      ).status(),
    ).toBe(403);

    const [archivedChurch] = await connection.database
      .select({ status: schema.churches.status })
      .from(schema.churches)
      .where(eq(schema.churches.id, createdChurchId));
    const [preservedMember] = await connection.database
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(eq(schema.members.id, member.id));
    expect(archivedChurch?.status).toBe('archived');
    expect(preservedMember?.id).toBe(member.id);
  });

  test('signs in through the web interface and opens the tenant dashboard', async ({
    page,
  }) => {
    await page.goto('/pt-BR/login');

    await expect(
      page.getByRole('heading', { name: 'Bem-vindo de volta' }),
    ).toBeVisible();
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar no painel' }).click();

    await expect(page).toHaveURL(/\/pt-BR\/dashboard$/);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: `E2E Church A ${suffix}`,
      }),
    ).toBeVisible();
    await expect(page.locator('.overview-grid').getByRole('link')).toHaveCount(
      3,
    );
    await expect(
      page.locator('.overview-grid').getByRole('link', { name: /Lançar/ }),
    ).toBeVisible();
  });
});
