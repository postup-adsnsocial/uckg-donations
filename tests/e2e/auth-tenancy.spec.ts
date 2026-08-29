import { hashPassword } from '@uckg/authorization';
import { createDatabase, schema } from '@uckg/database';
import { eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

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
const reportEmail = `e2e-reports-${suffix}@example.com`;
const reportPassword = `e2e-reports-password-${suffix}-secure`;
let churchAId = '';
let churchBId = '';
let createdChurchId = '';
let inactiveChurchId = '';
let platformUserId = '';
let reportUserId = '';
let userId = '';

async function expectMobileReportLayout(page: Page) {
  for (const viewport of [
    { height: 812, width: 375 },
    { height: 800, width: 320 },
  ]) {
    await page.setViewportSize(viewport);
    const issues = await page.evaluate(() => {
      const problems: string[] = [];
      const panels = document.querySelectorAll(
        '.report-builder, .report-builder__section, .report-custom-dates, .report-result, .report-result .panel-heading',
      );

      if (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      ) {
        problems.push('page overflows horizontally');
      }

      for (const panel of panels) {
        if (panel.scrollWidth > panel.clientWidth + 1) {
          problems.push(`${panel.className} overflows horizontally`);
        }
      }

      const controls = document.querySelectorAll(
        '.report-period-shortcuts button, .report-period-modes button, .report-year-input > button, .report-year-input input, .report-apply-period, .report-builder__footer > button, .report-result .product-primary-link, .report-custom-dates input, .report-month-input input',
      );
      for (const control of controls) {
        const controlRect = control.getBoundingClientRect();
        const panelRect = control
          .closest('.product-panel')
          ?.getBoundingClientRect();
        if (controlRect.height < 44) {
          problems.push(
            `${control.textContent?.trim() || control.getAttribute('type')} is shorter than 44px`,
          );
        }
        if (
          panelRect &&
          (controlRect.left < panelRect.left - 1 ||
            controlRect.right > panelRect.right + 1)
        ) {
          problems.push(
            `${control.textContent?.trim() || control.getAttribute('type')} exceeds its card`,
          );
        }
      }

      const downloadButton = document.querySelector(
        '.report-result .product-primary-link',
      );
      const heading = downloadButton?.closest('.panel-heading');
      if (
        downloadButton instanceof HTMLElement &&
        heading instanceof HTMLElement
      ) {
        const headingStyle = getComputedStyle(heading);
        const availableWidth =
          heading.clientWidth -
          Number.parseFloat(headingStyle.paddingInlineStart) -
          Number.parseFloat(headingStyle.paddingInlineEnd);
        if (downloadButton.getBoundingClientRect().width < availableWidth - 1) {
          problems.push('PDF download button does not fill the mobile card');
        }
      }

      return problems;
    });

    expect(issues, `report layout at ${viewport.width}px`).toEqual([]);
  }
}

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

    const [user, platformUser, reportUser] = await connection.database
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
        {
          displayName: 'E2E Reports Operator',
          email: reportEmail,
          passwordHash: await hashPassword(reportPassword),
        },
      ])
      .returning({ id: schema.adminUsers.id });

    if (
      !churchA ||
      !churchB ||
      !inactiveChurch ||
      !user ||
      !platformUser ||
      !reportUser
    ) {
      throw new Error('Unable to prepare the E2E tenant fixtures.');
    }

    churchAId = churchA.id;
    churchBId = churchB.id;
    inactiveChurchId = inactiveChurch.id;
    platformUserId = platformUser.id;
    reportUserId = reportUser.id;
    userId = user.id;

    await connection.database.insert(schema.churchMemberships).values([
      { churchId: churchAId, role: 'auditor', userId },
      {
        churchId: churchAId,
        role: 'financial_operator',
        userId: reportUserId,
      },
    ]);
  });

  test.afterAll(async () => {
    if (reportUserId) {
      await connection.database
        .delete(schema.annualBookDays)
        .where(eq(schema.annualBookDays.createdBy, reportUserId));
      await connection.database
        .delete(schema.donations)
        .where(eq(schema.donations.createdBy, reportUserId));
    }

    const userIds = [userId, platformUserId, reportUserId].filter(Boolean);
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

    const annualBook = await request.get(
      `${apiBaseUrl}/annual-book?month=2026-08`,
      { headers: { 'x-church-id': churchAId } },
    );
    expect(annualBook.status()).toBe(200);
    expect(
      (
        await request.put(`${apiBaseUrl}/annual-book/days/2026-08-28`, {
          data: {
            athMobileCents: 0,
            cardMachineCents: null,
            designatedEnvelopeCents: 0,
            entries: [],
            entryDate: '2026-08-28',
          },
          headers: { 'x-church-id': churchAId },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.get(`${apiBaseUrl}/annual-book?month=2026-08`, {
          headers: { 'x-church-id': churchBId },
        })
      ).status(),
    ).toBe(403);

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
      4,
    );
    await expect(
      page.locator('.overview-grid').getByRole('link', { name: /Livro Anual/ }),
    ).toBeVisible();
    await expect(
      page.locator('.overview-grid').getByRole('link', { name: /Lançar/ }),
    ).toBeVisible();
  });

  test('keeps the report builder and PDF action inside mobile cards', async ({
    page,
  }) => {
    const receivedOn = new Date().toISOString().slice(0, 10);
    const [donation] = await connection.database
      .insert(schema.donations)
      .values({
        amountCents: 1_250,
        churchId: churchAId,
        createdBy: reportUserId,
        paymentMethod: 'cash',
        receivedOn,
      })
      .returning({ id: schema.donations.id });
    if (!donation) throw new Error('Unable to prepare the report donation.');

    await page.goto('/pt-BR/login');
    await page.getByLabel('E-mail').fill(reportEmail);
    await page.getByLabel('Senha', { exact: true }).fill(reportPassword);
    await page.getByRole('button', { name: 'Entrar no painel' }).click();
    await expect(page).toHaveURL(/\/pt-BR\/dashboard$/);

    await page.goto('/pt-BR/reports');
    await expect(page.locator('.report-builder')).toBeVisible();
    await page.getByRole('tab', { name: 'Período personalizado' }).click();
    await expect(
      page.locator('.report-custom-dates input[type="date"]'),
    ).toHaveCount(2);
    await expectMobileReportLayout(page);

    await page.getByRole('tab', { name: /^Mês/ }).click();
    await expect(
      page.locator('.report-month-input input[type="month"]'),
    ).toBeVisible();
    await expectMobileReportLayout(page);

    await page.getByRole('button', { name: 'Visualizar relatório' }).click();
    await expect(page.locator('.report-result')).toBeVisible();
    await expect(
      page.locator('.report-result .product-primary-link'),
    ).toBeVisible();
    await expectMobileReportLayout(page);
  });

  test('records a daily annual book entry with the correct calendar day', async ({
    page,
  }) => {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);

    await page.goto('/pt-BR/login');
    await page.getByLabel('E-mail').fill(reportEmail);
    await page.getByLabel('Senha', { exact: true }).fill(reportPassword);
    await page.getByRole('button', { name: 'Entrar no painel' }).click();
    await expect(page).toHaveURL(/\/pt-BR\/dashboard$/);

    await page.goto(`/pt-BR/annual-book`);
    await expect(
      page.getByRole('heading', { level: 2, name: 'Livro Anual' }),
    ).toBeVisible();
    await expect(page.locator('input[type="month"]')).toHaveValue(month);

    const todayLabel = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      timeZone: 'UTC',
      weekday: 'long',
      year: 'numeric',
    }).format(new Date(`${today}T12:00:00Z`));
    const todayEditor = page
      .locator('.annual-book-day')
      .filter({ hasText: todayLabel });
    await expect(todayEditor).toHaveCount(1);
    await todayEditor.getByLabel('Dinheiro — 1º culto').fill('10.25');
    await todayEditor.getByLabel('Designated (envelopes)').fill('5.00');
    await todayEditor.getByLabel('Online').fill('2.00');
    await todayEditor.getByRole('button', { name: 'Salvar este dia' }).click();

    await expect(page.getByText(/Dia salvo com sucesso/)).toBeVisible();
    await expect(
      page
        .locator('.annual-book-summary article')
        .filter({ hasText: 'Undesignated' }),
    ).toContainText('5,25');
    await expect(
      page.getByRole('heading', {
        level: 3,
        name: 'Depósitos esperados — segunda a sexta',
      }),
    ).toBeVisible();
    await expect(
      page
        .locator('.annual-book-deposits tbody tr')
        .filter({ hasText: '10,25' }),
    ).toHaveCount(1);

    await page.getByRole('button', { name: 'Comparar períodos' }).click();
    const undesignatedComparison = page
      .locator('.annual-book-comparison-table tbody tr')
      .filter({ hasText: 'Undesignated' });
    await expect(undesignatedComparison).toBeVisible();
    await expect(undesignatedComparison).toContainText('5,25');
  });
});
