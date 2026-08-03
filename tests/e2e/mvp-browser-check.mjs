import { chromium, firefox } from '@playwright/test';
import { hashPassword } from '../../packages/authorization/dist/index.js';
import { createDatabase, schema } from '../../packages/database/dist/index.js';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
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
let churchId;
let userId;
let browser;

try {
  const [church] = await connection.database
    .insert(schema.churches)
    .values({ name: `Browser MVP ${suffix}`, slug: `browser-mvp-${suffix}` })
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
  await connection.database.insert(schema.churchMemberships).values({
    churchId,
    role: 'church_admin',
    userId,
  });

  const browserType =
    process.env.MVP_BROWSER === 'firefox' ? firefox : chromium;
  browser = await browserType.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(10_000);
  console.log('Opening login...');
  await page.goto('http://localhost:3000/pt-BR/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar no painel' }).click();
  await page.waitForURL(/\/pt-BR\/dashboard$/);
  console.log('Creating member...');

  await page.getByLabel('Nome completo').fill(memberName);
  await page.getByLabel(/Telefone/).fill('+1 212 555 0100');
  await page.getByRole('button', { name: 'Cadastrar membro' }).click();
  await page.getByText('Membro cadastrado com sucesso.').waitFor();
  console.log('Recording envelope...');

  await page.getByLabel('Valor do envelope').fill('125.50');
  await page
    .getByLabel(/Membro relacionado/)
    .selectOption({ label: memberName });
  await page.getByLabel(/Foto do envelope/).setInputFiles(envelopeImage);
  await page.getByLabel(/Observação/).fill('Browser MVP verification');
  await page.getByRole('button', { name: 'Salvar envelope' }).click();
  await page.getByText('Envelope lançado com sucesso.').waitFor();
  console.log('Capturing responsive views...');
  await page.screenshot({ fullPage: true, path: '/tmp/uckg-mvp-desktop.png' });

  const desktopOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  if (desktopOverflow)
    throw new Error('Desktop layout has horizontal overflow.');

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ fullPage: true, path: '/tmp/uckg-mvp-mobile.png' });
  const mobileOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  if (mobileOverflow) throw new Error('Mobile layout has horizontal overflow.');

  for (const localized of [
    { code: 'en', heading: 'Register member' },
    { code: 'es', heading: 'Registrar miembro' },
  ]) {
    await page.goto(`http://localhost:3000/${localized.code}/dashboard`);
    await page.getByRole('heading', { name: localized.heading }).waitFor();
    for (const viewport of [
      { height: 720, width: 1280 },
      { height: 812, width: 375 },
      { height: 800, width: 320 },
    ]) {
      await page.setViewportSize(viewport);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      if (overflow) {
        throw new Error(
          `${localized.code} layout overflows at ${viewport.width}px.`,
        );
      }
      if (viewport.width === 375) {
        await page.screenshot({
          fullPage: true,
          path: `/tmp/uckg-mvp-${localized.code}-mobile.png`,
        });
      }
    }
  }

  await page.goto('http://localhost:3000/pt-BR/dashboard');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: 'Ver imagem' }).click();
  await page.getByRole('dialog').waitFor();
  const imageVisible = await page
    .getByRole('dialog')
    .locator('img')
    .isVisible();
  if (!imageVisible) throw new Error('Private envelope image did not open.');

  console.log(
    `MVP browser check passed in ${process.env.MVP_BROWSER ?? 'chromium'} on desktop and mobile.`,
  );
} finally {
  await browser?.close();
  if (churchId) {
    await connection.pool.query('delete from churches where id = $1', [
      churchId,
    ]);
    await rm(`apps/api/.data/envelopes/${churchId}`, {
      force: true,
      recursive: true,
    });
  }
  if (userId) {
    await connection.pool.query('delete from admin_users where id = $1', [
      userId,
    ]);
  }
  await connection.pool.end();
}
