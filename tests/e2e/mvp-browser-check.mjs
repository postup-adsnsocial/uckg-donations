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
const managedChurchName = `UCKG Brooklyn ${suffix}`;
const managedChurchUpdatedName = `UCKG Brooklyn Center ${suffix}`;
const envelopeImage = fileURLToPath(
  new URL('../../apps/web/public/universal-logo.png', import.meta.url),
);
const browserName =
  process.env.MVP_BROWSER === 'firefox' ? 'firefox' : 'chromium';
const screenshotRoot = `/tmp/uckg-mvp-${browserName}`;
let churchId;
let managedChurchId;
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

    const overflowingCards = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          '.product-panel, .workspace-card, .detail-card, .status-card, .summary-grid > article, .overview-card, .report-builder',
        ),
      ]
        .filter((card) => card.scrollWidth > card.clientWidth + 1)
        .map((card) => card.className || card.tagName),
    );
    if (overflowingCards.length) {
      throw new Error(
        `${name} has overflowing cards at ${viewport.width}px in ${browserName}: ${overflowingCards.join(', ')}`,
      );
    }
  }
}

async function assertControlFitsPanel(page, selector, panelSelector, name) {
  const overflow = await page
    .locator(selector)
    .evaluate((control, targetPanelSelector) => {
      const panel = control.closest(targetPanelSelector);
      if (!panel) return 'panel not found';

      const controlRect = control.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const tolerance = 1;

      if (controlRect.left < panelRect.left - tolerance) {
        return `left edge ${controlRect.left} is outside ${panelRect.left}`;
      }
      if (controlRect.right > panelRect.right + tolerance) {
        return `right edge ${controlRect.right} exceeds ${panelRect.right}`;
      }
      return null;
    }, panelSelector);
  if (overflow) throw new Error(`${name}: ${overflow}`);
}

async function assertNativeDateControlHasNoOuterPadding(page, selector) {
  const padding = await page.locator(selector).evaluate((control) => {
    const styles = getComputedStyle(control);
    return [styles.paddingInlineEnd, styles.paddingInlineStart];
  });

  if (padding.some((value) => value !== '0px')) {
    throw new Error(
      `Native date control must not have outer padding on WebKit: ${padding.join(', ')}.`,
    );
  }
}

async function assertReportMobileLayout(page, name) {
  for (const viewport of [
    { height: 812, width: 375 },
    { height: 800, width: 320 },
  ]) {
    await page.setViewportSize(viewport);
    const issues = await page.evaluate(() => {
      const problems = [];
      const panelSelectors = [
        '.report-builder',
        '.report-builder__section',
        '.report-custom-dates',
        '.report-result',
        '.report-result .panel-heading',
      ];

      if (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      ) {
        problems.push('page overflows horizontally');
      }

      for (const selector of panelSelectors) {
        for (const panel of document.querySelectorAll(selector)) {
          if (panel.scrollWidth > panel.clientWidth + 1) {
            problems.push(`${selector} overflows horizontally`);
          }
        }
      }

      const controls = document.querySelectorAll(
        '.report-period-shortcuts button, .report-period-modes button, .report-year-input > button, .report-year-input input, .report-apply-period, .report-builder__footer > button, .report-result .product-primary-link, .report-custom-dates input, .report-month-input input',
      );
      for (const control of controls) {
        const controlRect = control.getBoundingClientRect();
        const panel = control.closest('.product-panel');
        const panelRect = panel?.getBoundingClientRect();
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

    if (issues.length) {
      throw new Error(
        `${name} has mobile layout issues at ${viewport.width}px: ${issues.join(', ')}`,
      );
    }
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
      isPlatformAdmin: true,
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
      `Platform overview must display four module access cards; found ${overviewCardCount}.`,
    );
  await page
    .locator('.overview-grid')
    .getByRole('link', { name: /Igrejas/ })
    .waitFor();
  if (await page.getByRole('link', { name: 'Doações', exact: true }).count())
    throw new Error('Donations must not appear in the product navigation.');
  await page
    .locator('.dashboard-sidebar')
    .getByRole('link', { name: 'Lançar', exact: true })
    .waitFor();
  await page
    .locator('.overview-grid')
    .getByRole('link', { name: /Lançar/ })
    .waitFor();
  await assertResponsive(page, 'dashboard');

  await page
    .locator('.mobile-product-nav')
    .getByRole('link', { name: 'Igrejas', exact: true })
    .click();
  await page.waitForURL(/\/pt-BR\/churches$/);
  await page.getByLabel('Nome da igreja').fill(managedChurchName);
  const [createChurchResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith('/churches') &&
        response.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Criar igreja' }).click(),
  ]);
  const createdChurch = await createChurchResponse.json();
  if (!createChurchResponse.ok() || !createdChurch.id)
    throw new Error(
      `Church creation failed (${createChurchResponse.status()}): ${JSON.stringify(createdChurch)}`,
    );
  managedChurchId = createdChurch.id;
  await page.getByText('Igreja criada com sucesso.').waitFor();
  await page
    .locator('.church-list')
    .getByText(managedChurchName, { exact: true })
    .waitFor();
  const managedChurchRow = page.locator('.church-list li').filter({
    hasText: managedChurchName,
  });
  await managedChurchRow
    .getByRole('button', { name: `Editar igreja: ${managedChurchName}` })
    .click();
  const managedChurchEditForm = page.locator('.church-edit-form');
  await managedChurchEditForm
    .getByRole('textbox')
    .fill(managedChurchUpdatedName);
  const [updateChurchResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith(`/churches/${managedChurchId}`) &&
        response.request().method() === 'PATCH',
    ),
    managedChurchEditForm.getByRole('button', { name: 'Salvar' }).click(),
  ]);
  if (!updateChurchResponse.ok())
    throw new Error(
      `Church update failed (${updateChurchResponse.status()}): ${await updateChurchResponse.text()}`,
    );
  await page.getByText('Nome da igreja atualizado com sucesso.').waitFor();
  await page
    .locator('.church-list')
    .getByText(managedChurchUpdatedName, { exact: true })
    .waitFor();
  await assertResponsive(page, 'churches');

  await page.goto('http://localhost:3000/pt-BR/members/new');
  const memberChurchSelect = page.locator('.church-assignment--select select');
  await memberChurchSelect.selectOption(managedChurchId);
  if ((await memberChurchSelect.inputValue()) !== managedChurchId)
    throw new Error('The new member church selector did not retain its value.');
  await page.getByLabel('Nome completo').fill(memberName);
  await page
    .getByLabel('E-mail · Opcional')
    .fill(`member-${suffix}@example.com`);
  await page.getByLabel('Telefone · Opcional').fill('+12125550100');
  await assertResponsive(page, 'member-new');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await page.waitForURL(/\/pt-BR\/members\/[0-9a-f-]+\?saved=1$/);
  await page.getByRole('heading', { level: 2, name: memberName }).waitFor();
  await page
    .locator('.detail-card dl')
    .getByText(managedChurchUpdatedName, { exact: true })
    .waitFor();
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
  const memberSearch = page.getByRole('combobox', {
    name: /Membro relacionado/,
  });
  await memberSearch.fill(memberName.slice(0, -3));
  const memberOption = page.getByRole('option', {
    name: new RegExp(memberName),
  });
  await memberOption.waitFor();
  await assertResponsive(page, 'envelope-member-search');
  await memberOption.click();
  if ((await page.locator('input[name="memberId"]').inputValue()) === '')
    throw new Error('Member autocomplete did not select a member.');
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
  await assertControlFitsPanel(
    page,
    'input[name="receivedOn"]',
    '.product-form',
    'Received date field overflows the envelope form',
  );
  await assertNativeDateControlHasNoOuterPadding(
    page,
    'input[name="receivedOn"]',
  );
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
  await page.locator('.envelope-preview').waitFor();
  if ((await page.getByRole('button', { name: 'Ver detalhes' }).count()) !== 0)
    throw new Error(
      'Envelope image must open without a second details button.',
    );
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
  await page.getByRole('tab', { name: 'Período personalizado' }).click();
  await page
    .locator('.report-custom-dates input[type="date"]')
    .first()
    .waitFor();
  await assertReportMobileLayout(page, 'reports-custom-period');
  await page.getByRole('tab', { name: /^Mês/ }).click();
  await page.locator('.report-month-input input[type="month"]').waitFor();
  await assertReportMobileLayout(page, 'reports-month-period');
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
  await assertReportMobileLayout(page, 'reports-result');
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
  const memberRow = memberTable.locator('tbody tr').filter({
    hasText: memberName,
  });
  const memberNameLink = memberRow.getByRole('link', {
    name: memberName,
    exact: true,
  });
  await memberNameLink.waitFor();
  const memberDetailsLink = memberRow.getByRole('link', {
    name: 'Detalhes do membro',
  });
  if ((await memberDetailsLink.count()) !== 1)
    throw new Error('Expected one member view action.');
  if (
    (await memberRow.getByRole('link', { name: 'Editar membro' }).count()) !== 1
  )
    throw new Error('Expected one member edit action.');
  if (
    (await memberRow
      .getByRole('button', { name: 'Excluir membro' })
      .count()) !== 1
  )
    throw new Error('Expected one member delete action.');
  await assertResponsive(page, 'members-actions');
  await memberNameLink.click();
  await page
    .getByRole('heading', { level: 3, name: 'Histórico de lançamentos' })
    .waitFor();
  const memberHistory = page.locator('.member-history');
  await memberHistory.getByText(/125,50/).waitFor();
  await memberHistory.getByText('Cheque', { exact: true }).waitFor();
  if (
    (await memberHistory
      .getByRole('link', { name: /Ver detalhes/ })
      .count()) !== 1
  )
    throw new Error('Expected the member history entry to be viewable.');
  await assertResponsive(page, 'member-detail-history');
  await page.getByRole('link', { name: 'Voltar', exact: true }).click();
  await page.waitForURL(/\/pt-BR\/members$/);
  const refreshedMemberRow = page.locator('.product-table tbody tr').filter({
    hasText: memberName,
  });
  page.once('dialog', (dialog) => dialog.accept());
  await refreshedMemberRow
    .getByRole('button', { name: 'Excluir membro' })
    .click();
  await page.getByText('Membro excluído com sucesso.').waitFor();

  await page.goto('http://localhost:3000/pt-BR/churches');
  const updatedChurchRow = page.locator('.church-list li').filter({
    hasText: managedChurchUpdatedName,
  });
  await updatedChurchRow.waitFor();
  page.once('dialog', (dialog) => dialog.accept());
  const [deleteChurchResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith(`/churches/${managedChurchId}`) &&
        response.request().method() === 'DELETE',
    ),
    updatedChurchRow
      .getByRole('button', {
        name: `Excluir igreja: ${managedChurchUpdatedName}`,
      })
      .click(),
  ]);
  if (!deleteChurchResponse.ok())
    throw new Error(
      `Church deletion failed (${deleteChurchResponse.status()}): ${await deleteChurchResponse.text()}`,
    );
  await page.getByText('Igreja excluída do menu com sucesso.').waitFor();
  if ((await updatedChurchRow.count()) !== 0)
    throw new Error('Deleted church remains visible in the church menu.');

  for (const locale of ['en', 'es']) {
    for (const path of [
      'dashboard',
      'churches',
      'members',
      'envelopes',
      'reports',
    ]) {
      await page.goto(`http://localhost:3000/${locale}/${path}`);
      await assertResponsive(page, `${locale}-${path}`);
    }
  }
  await page.goto('http://localhost:3000/pt-BR/dashboard');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: 'Sair do sistema' }).click();
  await page.waitForURL(/\/pt-BR\/login$/);
  console.log(
    `MVP visual and functional review passed in ${browserName}. Screenshots: ${screenshotRoot}`,
  );
} finally {
  await browser?.close();
  if (churchId || managedChurchId) {
    const churchIds = [churchId, managedChurchId].filter(Boolean);
    await connection.pool.query('delete from churches where id = any($1)', [
      churchIds,
    ]);
    for (const id of churchIds) {
      await rm(`.data/envelopes/${id}`, { force: true, recursive: true });
      await rm(`.data/reports/${id}`, { force: true, recursive: true });
    }
  }
  if (userId)
    await connection.pool.query('delete from admin_users where id = $1', [
      userId,
    ]);
  await connection.pool.end();
}
