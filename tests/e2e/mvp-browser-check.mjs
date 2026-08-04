import { chromium, firefox } from '@playwright/test';
import { hashPassword } from '../../packages/authorization/dist/index.js';
import { createDatabase, schema } from '../../packages/database/dist/index.js';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, stat } from 'node:fs/promises';
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
  const overviewCards = page.locator('.overview-grid').getByRole('link');
  try {
    await overviewCards.first().waitFor();
  } catch (error) {
    const bodyText = (await page.locator('body').innerText()).slice(0, 1_000);
    throw new Error(
      `Overview cards did not render at ${page.url()}. Page content: ${bodyText}`,
      { cause: error },
    );
  }
  const overviewCardCount = await overviewCards.count();
  if (overviewCardCount !== 4)
    throw new Error(
      `Overview must display four module access cards; found ${overviewCardCount}.`,
    );
  await page
    .locator('.dashboard-sidebar')
    .getByRole('link', { name: 'Lançar', exact: true })
    .waitFor();
  await page
    .locator('.overview-grid')
    .getByRole('link', { name: /Lançar/ })
    .waitFor();
  await assertResponsive(page, 'dashboard');

  await page.goto('http://localhost:3000/pt-BR/members/new');
  await page.getByLabel('Nome completo').fill(memberName);
  await page
    .getByLabel('E-mail · Opcional')
    .fill(`member-${suffix}@example.com`);
  await page.getByLabel('Telefone · Opcional').fill('+12125550100');
  await assertResponsive(page, 'member-new');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await page.waitForURL(/\/pt-BR\/members\/[0-9a-f-]+\?saved=1$/);
  await page.getByRole('heading', { level: 2, name: memberName }).waitFor();
  const addressCard = page
    .locator('.detail-card')
    .filter({ hasText: 'Endereço' });
  await addressCard.getByText('—', { exact: true }).waitFor();
  await assertResponsive(page, 'member-detail-no-address');

  await page.goto('http://localhost:3000/pt-BR/envelopes/new');
  const launchFieldOrder = await page.locator('.form-grid').evaluate((grid) =>
    [...grid.children].map((element) => {
      if (element.querySelector('[name="memberId"]')) return 'member';
      if (element.querySelector('[name="receivedOn"]')) return 'date';
      if (element.querySelector('[name="amount"]')) return 'amount';
      if (element.querySelector('[name="paymentMethod"]')) return 'payment';
      if (element.querySelector('[name="image"]')) return 'image';
      if (element.querySelector('[name="notes"]')) return 'notes';
      return 'unknown';
    }),
  );
  if (launchFieldOrder.join(',') !== 'member,date,amount,payment,image,notes')
    throw new Error(`Unexpected launch field order: ${launchFieldOrder}`);
  await page
    .getByLabel(/Membro relacionado/)
    .selectOption({ label: memberName });
  await page.getByLabel('Data de recebimento').waitFor();
  await page.getByLabel('Valor (USD)').fill('125.50');
  const amountType = await page.getByLabel('Valor (USD)').getAttribute('type');
  if (amountType === 'number')
    throw new Error('Amount field remains sensitive to mouse wheel changes.');
  const paymentMethods = page.getByRole('radiogroup', {
    name: 'Forma de pagamento',
  });
  if ((await paymentMethods.getByRole('radio').count()) !== 3)
    throw new Error('Expected three visual payment method options.');
  await paymentMethods.getByRole('radio', { name: 'Cheque' }).check();
  await page
    .getByRole('button', { name: 'Fotografar envelope', exact: true })
    .waitFor();
  await page
    .getByRole('button', { name: 'Selecionar imagem', exact: true })
    .waitFor();
  await assertResponsive(page, 'envelope-new-empty');
  await page.getByLabel(/Imagem do envelope/).setInputFiles(envelopeImage);
  await page.getByText('Imagem pronta para envio').waitFor();
  await page.getByLabel(/Observação/).fill('Browser MVP verification');
  await assertResponsive(page, 'envelope-new');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await page.waitForURL(/\/pt-BR\/envelopes\?saved=1$/);
  await page.getByText('Envelope lançado com sucesso.').waitFor();
  const envelopeTable = page.locator('.product-table');
  await envelopeTable.getByText(memberName, { exact: true }).waitFor();
  const detailLinks = envelopeTable.getByRole('link', { name: 'Ver detalhes' });
  if ((await detailLinks.count()) !== 1)
    throw new Error('Expected one envelope detail link.');
  await detailLinks.click();
  await page
    .getByRole('heading', { level: 2, name: 'Detalhes do envelope' })
    .waitFor();
  await page.getByRole('button', { name: 'Ver detalhes' }).click();
  await page.locator('.envelope-preview').waitFor();
  await assertResponsive(page, 'envelope-detail');

  await page.goto('http://localhost:3000/pt-BR/reports');
  await page.locator('.report-type-options').waitFor();
  const reportTypes = page.locator('.report-type-options input[type="radio"]');
  if ((await reportTypes.count()) !== 3)
    throw new Error('Expected three visual report type options.');
  if ((await page.locator('.report-month-grid button').count()) !== 12)
    throw new Error('Expected all twelve months in the period picker.');
  await page.getByLabel('Incluir imagens dos envelopes no PDF').check();
  await assertResponsive(page, 'reports-builder');
  const [reportDataResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/donations?')),
    page.getByRole('button', { name: 'Visualizar relatório' }).click(),
  ]);
  const reportData = await reportDataResponse.json();
  if (!reportDataResponse.ok() || !Array.isArray(reportData))
    throw new Error(
      `Report data request failed (${reportDataResponse.status()}): ${JSON.stringify(reportData)}`,
    );
  if (!reportData.length)
    throw new Error('The generated report did not include the saved envelope.');
  const downloadReportButton = page.locator(
    '.report-result .product-primary-link',
  );
  await downloadReportButton.waitFor();
  const [pdfWithImagesDownload] = await Promise.all([
    page.waitForEvent('download'),
    downloadReportButton.click(),
  ]);
  const pdfWithImagesPath = await pdfWithImagesDownload.path();
  if (!pdfWithImagesPath || (await stat(pdfWithImagesPath)).size < 5_000) {
    throw new Error('Detailed PDF was not generated with its envelope image.');
  }
  const pdfWithImagesSize = (await stat(pdfWithImagesPath)).size;
  await page.getByLabel('Incluir imagens dos envelopes no PDF').uncheck();
  const [pdfWithoutImagesDownload] = await Promise.all([
    page.waitForEvent('download'),
    downloadReportButton.click(),
  ]);
  const pdfWithoutImagesPath = await pdfWithoutImagesDownload.path();
  if (
    !pdfWithoutImagesPath ||
    (await stat(pdfWithoutImagesPath)).size >= pdfWithImagesSize
  ) {
    throw new Error('PDF image option did not change the generated document.');
  }
  await page.locator('input[name="reportType"][value="member_totals"]').check();
  await page.getByText(memberName).waitFor();
  await assertResponsive(page, 'reports');

  await page.goto('http://localhost:3000/pt-BR/members');
  const memberTable = page.locator('.product-table');
  await memberTable.getByText(memberName, { exact: true }).waitFor();
  const memberDetailsLink = memberTable.getByRole('link', {
    name: 'Detalhes do membro',
  });
  if ((await memberDetailsLink.count()) !== 1)
    throw new Error('Expected one member detail link.');
  await memberDetailsLink.click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Excluir membro' }).click();
  await page.waitForURL(/\/pt-BR\/members\?deleted=1$/);
  await page.getByText('Membro excluído com sucesso.').waitFor();

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
