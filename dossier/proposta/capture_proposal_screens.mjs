import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const outputDir = new URL('./assets/screens/', import.meta.url);
await mkdir(outputDir, { recursive: true });

const church = {
  id: '11111111-1111-4111-8111-111111111111',
  locale: 'pt-BR',
  name: 'UCKG Brooklyn',
  slug: 'uckg-brooklyn',
  timezone: 'America/New_York',
};

const user = {
  displayName: 'Administração UCKG',
  email: 'admin@uckg.org',
  id: '22222222-2222-4222-8222-222222222222',
  isPlatformAdmin: true,
};

const memberSeed = [
  [
    'Ana Oliveira',
    'ana.oliveira@example.org',
    '+1 718 555 0101',
    'Brooklyn',
    'NY',
  ],
  [
    'Carlos Santos',
    'carlos.santos@example.org',
    '+1 718 555 0102',
    'Queens',
    'NY',
  ],
  [
    'Daniela Costa',
    'daniela.costa@example.org',
    '+1 718 555 0103',
    'Brooklyn',
    'NY',
  ],
  [
    'João Pereira',
    'joao.pereira@example.org',
    '+1 718 555 0104',
    'Manhattan',
    'NY',
  ],
  [
    'Mariana Lima',
    'mariana.lima@example.org',
    '+1 718 555 0105',
    'Bronx',
    'NY',
  ],
  [
    'Rafael Souza',
    'rafael.souza@example.org',
    '+1 718 555 0106',
    'Brooklyn',
    'NY',
  ],
];

const members = memberSeed.map(
  ([fullName, email, phone, city, region], index) => ({
    addressLine1: `${101 + index} Church Avenue`,
    addressLine2: null,
    city,
    country: 'US',
    createdAt: '2026-01-10T12:00:00.000Z',
    deletedAt: null,
    email,
    fullName,
    id: `33333333-3333-4333-8333-33333333333${index}`,
    notes: null,
    phone,
    postalCode: '11218',
    region,
    status: 'active',
    updatedAt: '2026-08-01T12:00:00.000Z',
  }),
);

const donationSeed = [
  [0, 12550, 'cash', '2026-08-02'],
  [1, 25000, 'check', '2026-08-03'],
  [2, 17575, 'card', '2026-08-03'],
  [3, 30000, 'cash', '2026-08-04'],
  [4, 20000, 'check', '2026-08-05'],
  [0, 15000, 'card', '2026-08-06'],
];

const donations = donationSeed.map(
  ([memberIndex, amountCents, paymentMethod, receivedOn], index) => ({
    amountCents,
    createdAt: `${receivedOn}T15:30:00.000Z`,
    envelope: {
      contentType: 'image/jpeg',
      originalName: `envelope-${index + 1}.jpg`,
      sizeBytes: 284000 + index * 9000,
    },
    id: `44444444-4444-4444-8444-44444444444${index}`,
    member: {
      fullName: members[memberIndex].fullName,
      id: members[memberIndex].id,
    },
    notes: index === 1 ? 'Culto de domingo' : null,
    operatorName: 'Administração UCKG',
    paymentMethod,
    receivedOn,
  }),
);

const archivedReports = [
  {
    createdAt: '2026-08-05T18:00:00.000Z',
    endDate: '2026-08-05',
    envelopeCount: 5,
    id: '55555555-5555-4555-8555-555555555551',
    includeImages: true,
    reportType: 'detailed',
    startDate: '2026-08-01',
    totalCents: 105125,
  },
];

const browser = await chromium.launch();
const context = await browser.newContext({
  colorScheme: 'light',
  locale: 'pt-BR',
  reducedMotion: 'reduce',
  viewport: { height: 980, width: 1440 },
});
const page = await context.newPage();
page.setDefaultTimeout(8_000);
await context.addInitScript(() => {
  localStorage.setItem(
    'uckg_selected_church',
    '11111111-1111-4111-8111-111111111111',
  );
});

await page.route('http://localhost:3001/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname;
  let body = {};

  if (request.method() === 'OPTIONS') {
    await route.fulfill({
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'content-type,x-church-id',
        'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'access-control-allow-origin': 'http://127.0.0.1:3100',
      },
      status: 204,
    });
    return;
  }

  if (path === '/auth/me') {
    body = {
      memberships: [
        {
          churchId: church.id,
          churchName: church.name,
          churchSlug: church.slug,
          role: 'church_admin',
        },
      ],
      user,
    };
  } else if (path === '/churches') {
    body = [church];
  } else if (path === '/churches/current') {
    body = { church };
  } else if (path === '/members') {
    body = { items: members, total: members.length };
  } else if (path === '/donations') {
    body = donations;
  } else if (path === '/reports') {
    body = archivedReports;
  } else {
    body = {};
  }

  await route.fulfill({
    body: JSON.stringify(body),
    contentType: 'application/json; charset=utf-8',
    headers: {
      'access-control-allow-credentials': 'true',
      'access-control-allow-origin': 'http://127.0.0.1:3100',
    },
    status: 200,
  });
});

async function prepare(path) {
  await page.goto(`http://127.0.0.1:3100${path}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.documentElement.style.caretColor = 'transparent';
  });
  await page.addStyleTag({
    content: 'nextjs-portal { display: none !important; }',
  });
}

async function screenshot(name, options = {}, directory = outputDir) {
  await page.screenshot({
    animations: 'disabled',
    path: fileURLToPath(new URL(`${name}.png`, directory)),
    ...options,
  });
}

await page.goto('http://127.0.0.1:3100/pt-BR/login', {
  waitUntil: 'domcontentloaded',
});
await page.evaluate(async () => document.fonts.ready);
await page.getByLabel('E-mail').fill('admin@uckg.org');
await page.addStyleTag({
  content: 'nextjs-portal { display: none !important; }',
});
await screenshot('login');

await prepare('/pt-BR/dashboard');
await page.locator('.overview-grid').waitFor();
await screenshot('dashboard');

await prepare('/pt-BR/members');
await page.locator('.product-table').waitFor();
await screenshot('members');

await prepare('/pt-BR/envelopes/new');
await page.locator('.product-form').waitFor();
await screenshot('envelope-launch', { fullPage: true });

await prepare('/pt-BR/reports');
await page.locator('.report-builder').waitFor();
await screenshot('reports-builder', { fullPage: true });
await page.getByRole('button', { name: 'Visualizar relatório' }).click();
await page.locator('.report-result').waitFor();
await page.locator('.report-result').screenshot({
  animations: 'disabled',
  path: fileURLToPath(new URL('reports-result.png', outputDir)),
});

for (const locale of [
  { code: 'en', generate: 'Preview report' },
  { code: 'es', generate: 'Visualizar informe' },
]) {
  const localeOutputDir = new URL(
    `./assets/screens/${locale.code}/`,
    import.meta.url,
  );
  await mkdir(localeOutputDir, { recursive: true });

  await page.goto(`http://127.0.0.1:3100/${locale.code}/login`, {
    waitUntil: 'domcontentloaded',
  });
  await page.evaluate(async () => document.fonts.ready);
  await page
    .getByLabel(locale.code === 'en' ? 'Email' : 'Correo electrónico')
    .fill('admin@uckg.org');
  await page.addStyleTag({
    content: 'nextjs-portal { display: none !important; }',
  });
  await screenshot('login', {}, localeOutputDir);

  await prepare(`/${locale.code}/dashboard`);
  await page.locator('.overview-grid').waitFor();
  await screenshot('dashboard', {}, localeOutputDir);

  await prepare(`/${locale.code}/members`);
  await page.locator('.product-table').waitFor();
  await screenshot('members', {}, localeOutputDir);

  await prepare(`/${locale.code}/envelopes/new`);
  await page.locator('.product-form').waitFor();
  await screenshot('envelope-launch', { fullPage: true }, localeOutputDir);

  await prepare(`/${locale.code}/reports`);
  await page.locator('.report-builder').waitFor();
  await screenshot('reports-builder', { fullPage: true }, localeOutputDir);
  await page.getByRole('button', { name: locale.generate }).click();
  await page.locator('.report-result').waitFor();
  await page.locator('.report-result').screenshot({
    animations: 'disabled',
    path: fileURLToPath(new URL('reports-result.png', localeOutputDir)),
  });
}

await browser.close();
console.log(new URL('.', outputDir).pathname);
