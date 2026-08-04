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
const suffix = randomUUID().slice(0, 8);
const email = `e2e-auditor-${suffix}@example.com`;
const password = `e2e-password-${suffix}-secure`;
let churchAId = '';
let churchBId = '';
let userId = '';

test.describe('administrative authentication and tenant isolation', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const [churchA, churchB] = await connection.database
      .insert(schema.churches)
      .values([
        { name: `E2E Church A ${suffix}`, slug: `e2e-church-a-${suffix}` },
        { name: `E2E Church B ${suffix}`, slug: `e2e-church-b-${suffix}` },
      ])
      .returning({ id: schema.churches.id });

    const [user] = await connection.database
      .insert(schema.adminUsers)
      .values({
        displayName: 'E2E Auditor',
        email,
        passwordHash: await hashPassword(password),
      })
      .returning({ id: schema.adminUsers.id });

    if (!churchA || !churchB || !user) {
      throw new Error('Unable to prepare the E2E tenant fixtures.');
    }

    churchAId = churchA.id;
    churchBId = churchB.id;
    userId = user.id;

    await connection.database.insert(schema.churchMemberships).values({
      churchId: churchAId,
      role: 'auditor',
      userId,
    });
  });

  test.afterAll(async () => {
    if (userId) {
      await connection.database
        .delete(schema.adminUsers)
        .where(eq(schema.adminUsers.id, userId));
    }

    if (churchAId && churchBId) {
      await connection.database
        .delete(schema.churches)
        .where(inArray(schema.churches.id, [churchAId, churchBId]));
    }

    await connection.pool.end();
  });

  test('returns 401 without a session', async ({ request }) => {
    const response = await request.get('http://localhost:3001/auth/me');

    expect(response.status()).toBe(401);
  });

  test('authenticates and denies cross-tenant and role escalation', async ({
    request,
  }) => {
    const login = await request.post('http://localhost:3001/auth/login', {
      data: { email, password },
    });

    expect(login.status()).toBe(201);
    expect(login.headers()['set-cookie']).toContain('HttpOnly');
    expect(login.headers()['set-cookie']).toContain('SameSite=Strict');

    const me = await request.get('http://localhost:3001/auth/me');
    expect(me.status()).toBe(200);
    await expect(me.json()).resolves.toMatchObject({
      memberships: [{ churchId: churchAId, role: 'auditor' }],
      user: { email },
    });

    const ownChurch = await request.get(
      'http://localhost:3001/churches/current',
      {
        headers: { 'x-church-id': churchAId },
      },
    );
    expect(ownChurch.status()).toBe(200);

    const otherChurch = await request.get(
      'http://localhost:3001/churches/current',
      {
        headers: { 'x-church-id': churchBId },
      },
    );
    expect(otherChurch.status()).toBe(403);

    const settings = await request.get(
      'http://localhost:3001/churches/current/settings',
      {
        headers: { 'x-church-id': churchAId },
      },
    );
    expect(settings.status()).toBe(403);
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
      4,
    );
    await expect(
      page.locator('.overview-grid').getByRole('link', { name: /Lançar/ }),
    ).toBeVisible();
  });
});
