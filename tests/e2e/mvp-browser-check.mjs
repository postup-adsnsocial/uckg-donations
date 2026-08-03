import { chromium, firefox } from '@playwright/test';
import { hashPassword } from '../../packages/authorization/dist/index.js';
import { createDatabase, schema } from '../../packages/database/dist/index.js';
import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const connection = createDatabase(
  process.env.MIGRATION_DATABASE_URL ??
    'postgresql://uckg:uckg@localhost:5432/uckg_donations',
);
const suffix = randomUUID().slice(0, 8);
const email = `browser-mvp-${suffix}@example.com`;
const password = `browser-password-${suffix}`;
const memberName = `Member ${suffix}`;
const envelopeImage = fileURLToPath(
  new URL('../../apps/web/public/universal-logo.png', import.meta.url),
);
const browserName =
  process.env.MVP_BROWSER === 'firefox' ? 'firefox' : 'chromium';
const screenshotRoot = `/tmp/uckg-mvp-${browserName}`;
let churchId;
let userId;
let browser;

async function assertResponsive(page, name) {
  for (const viewport of [
    { height: 800, width: 1280 },
    { height: 812, width: 375 },
    { height: 800, width: 320 },
  ]) {
    await page.setViewportSize(viewport);
    await page.screenshot({
      fullPage: true,
      path: `${screenshotRoot}/${name}-${viewport.width}.png`,
    });
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    if (overflow)
      throw new Error(
        `${name} overflows at ${viewport.width}px in ${browserName}.`,
      );
  }
}

try {
  await mkdir(screenshotRoot, { recursive: true });
  const [church] = await connection.database
    .insert(schema.churches)
    .values({
      name: `UCKG New York ${suffix}`,
      slug: `browser-mvp-${suffix}`,
      city: 'New York',
      region: 'NY',
      country: 'US',
    })
    .returning({ id: schema.churches.id });
  const [user] = await connection.database
    .insert(schema.adminUsers)
    .values({
      displayName: 'MVP Browser Check',
      email,
      passwordHash: await hashPassword(password),
    })
    .returning({ id: schema.adminUsers.id });
  if (!church || !user) throw new Error('Unable to create browser fixtures.');
  churchId = church.id;
  userId = user.id;
  await connection.database
    .insert(schema.churchMemberships)
    .values({ churchId, role: 'church_admin', userId });

  browser = await (browserName === 'firefox' ? firefox : chromium).launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  page.setDefaultTimeout(12_000);
  await page.goto('http://localhost:3000/pt-BR/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar no painel' }).click();
  await page.waitForURL(/\/pt-BR\/dashboard$/);
  await assertResponsive(page, 'dashboard');

  await page.goto('http://localhost:3000/pt-BR/members/new');
  await page.getByLabel('Nome completo').fill(memberName);
  await page
    .getByLabel('E-mail · Opcional')
    .fill(`member-${suffix}@example.com`);
  await page.getByLabel('Telefone · Opcional').fill('+12125550100');
  await page.getByLabel('Endereço', { exact: true }).fill('350 Fifth Avenue');
  await page.getByLabel('Cidade').fill('New York');
  await page.getByLabel('Estado').selectOption('NY');
  await page.getByLabel('ZIP Code').fill('10118');
  await assertResponsive(page, 'member-new');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await page.waitForURL(/\/pt-BR\/members\/[0-9a-f-]+\?saved=1$/);
  await page.getByRole('heading', { name: 'Detalhes do membro' }).waitFor();

  await page.goto('http://localhost:3000/pt-BR/envelopes/new');
  await page.getByLabel('Valor (USD)').fill('125.50');
  await page
    .getByLabel(/Membro relacionado/)
    .selectOption({ label: memberName });
  await page.getByLabel(/Imagem do envelope/).setInputFiles(envelopeImage);
  await page.getByLabel(/Observação/).fill('Browser MVP verification');
  await assertResponsive(page, 'envelope-new');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await page.waitForURL(/\/pt-BR\/envelopes\/[0-9a-f-]+\?saved=1$/);
  await page.getByRole('heading', { name: 'Detalhes do envelope' }).waitFor();
  await page.getByRole('button', { name: 'Ver detalhes' }).click();
  await page.locator('.envelope-preview').waitFor();
  await assertResponsive(page, 'envelope-detail');

  await page.goto('http://localhost:3000/pt-BR/reports');
  await page.getByRole('button', { name: 'Gerar relatório' }).click();
  await page.getByText('$125.50', { exact: false }).first().waitFor();
  await assertResponsive(page, 'reports');

  for (const locale of ['en', 'es']) {
    for (const path of ['dashboard', 'members', 'envelopes', 'reports']) {
      await page.goto(`http://localhost:3000/${locale}/${path}`);
      await assertResponsive(page, `${locale}-${path}`);
    }
  }
  console.log(
    `MVP visual and functional review passed in ${browserName}. Screenshots: ${screenshotRoot}`,
  );
} finally {
  await browser?.close();
  if (churchId) {
    await connection.pool.query('delete from churches where id = $1', [
      churchId,
    ]);
    await rm(`.data/envelopes/${churchId}`, { force: true, recursive: true });
    await rm(`.data/reports/${churchId}`, { force: true, recursive: true });
  }
  if (userId)
    await connection.pool.query('delete from admin_users where id = $1', [
      userId,
    ]);
  await connection.pool.end();
}
