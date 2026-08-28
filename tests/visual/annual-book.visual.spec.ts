import { expect, test } from '@playwright/test';

const locales = [
  { code: 'pt-BR', title: 'Livro Anual' },
  { code: 'en', title: 'Annual Book' },
  { code: 'es', title: 'Libro Anual' },
] as const;

const emptyMetrics = {
  athMobileCents: 0,
  cardCents: 0,
  cardDifferenceCents: null,
  cardMachineCents: 0,
  cashCents: 0,
  checkCents: 0,
  designatedEnvelopeCents: 0,
  expectedDepositCents: 0,
  totalWithAthCents: 0,
  totalWithoutAthCents: 0,
  undesignatedCents: 0,
};

function monthPayload(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const endDay = new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate();
  const days = Array.from({ length: endDay }, (_, index) => {
    const entryDate = `${month}-${String(index + 1).padStart(2, '0')}`;
    return {
      athMobileCents: index === 0 ? 2_000 : 0,
      cardMachineCents: index === 0 ? 3_000 : null,
      designatedEnvelopeCents: index === 0 ? 5_000 : 0,
      entries:
        index === 0
          ? [
              {
                amountCents: 10_000,
                paymentMethod: 'cash',
                serviceSlot: 'first',
              },
              {
                amountCents: 3_000,
                paymentMethod: 'card',
                serviceSlot: 'first',
              },
            ]
          : [],
      entryDate,
      metrics:
        index === 0
          ? {
              ...emptyMetrics,
              athMobileCents: 2_000,
              cardCents: 3_000,
              cardDifferenceCents: 0,
              cardMachineCents: 3_000,
              cashCents: 10_000,
              designatedEnvelopeCents: 5_000,
              expectedDepositCents: 10_000,
              totalWithAthCents: 15_000,
              totalWithoutAthCents: 13_000,
              undesignatedCents: 8_000,
            }
          : emptyMetrics,
      notes: null,
      saved: index === 0,
      weekday: 'monday',
    };
  });
  const expectedDeposits = days
    .filter((day) => {
      const weekday = new Date(`${day.entryDate}T12:00:00Z`).getUTCDay();
      return weekday > 0 && weekday < 6;
    })
    .map((day) => ({
      cashCents: 0,
      checkCents: 0,
      depositDate: day.entryDate,
      sourceDates: [],
      totalCents: 0,
      weekday: day.weekday,
    }));

  return {
    days,
    endDate: `${month}-${String(endDay).padStart(2, '0')}`,
    expectedDeposits,
    month,
    startDate: `${month}-01`,
    summary: {
      ...emptyMetrics,
      athMobileCents: 2_000,
      cardCents: 3_000,
      cardDifferenceCents: 0,
      cardMachineCents: 3_000,
      cashCents: 10_000,
      designatedEnvelopeCents: 5_000,
      expectedDepositCents: 10_000,
      totalWithAthCents: 15_000,
      totalWithoutAthCents: 13_000,
      undesignatedCents: 8_000,
    },
  };
}

for (const locale of locales) {
  test(`${locale.code} annual book passes the visual quality gate`, async ({
    page,
  }) => {
    await page.route('http://localhost:3001/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/auth/me') {
        await route.fulfill({
          json: {
            memberships: [
              {
                churchId: '11111111-1111-4111-8111-111111111111',
                churchName: 'Universal Visual Test',
                churchSlug: 'universal-visual-test',
                role: 'church_admin',
              },
            ],
            user: {
              displayName: 'Visual Reviewer',
              email: 'visual@example.com',
              id: '22222222-2222-4222-8222-222222222222',
              isPlatformAdmin: false,
            },
          },
        });
        return;
      }
      if (url.pathname === '/churches/current') {
        await route.fulfill({
          json: {
            church: {
              id: '11111111-1111-4111-8111-111111111111',
              locale: locale.code,
              name: 'Universal Visual Test',
              slug: 'universal-visual-test',
              timezone: 'America/Puerto_Rico',
            },
          },
        });
        return;
      }
      if (url.pathname === '/annual-book') {
        await route.fulfill({
          json: monthPayload(
            url.searchParams.get('month') ??
              new Date().toISOString().slice(0, 7),
          ),
        });
        return;
      }
      await route.fulfill({ status: 404 });
    });

    await page.goto(`/${locale.code}/annual-book`, {
      waitUntil: 'networkidle',
    });
    await page.evaluate(async () => document.fonts.ready);
    await page.addStyleTag({
      content: 'nextjs-portal { display: none !important; }',
    });
    await expect(
      page.getByRole('heading', { level: 2, name: locale.title }),
    ).toBeVisible();
    await page.locator('.annual-book-day').first().locator('summary').click();

    const layoutIssues = await page.evaluate(() => {
      const issues: string[] = [];
      const root = document.documentElement;
      if (root.scrollWidth > root.clientWidth + 1) {
        issues.push(
          `horizontal overflow: ${root.scrollWidth}px > ${root.clientWidth}px`,
        );
      }

      for (const selector of [
        '.annual-book-month-bar button',
        '.annual-book-month-bar input',
        '.annual-book-day[open] button',
      ]) {
        for (const element of document.querySelectorAll(selector)) {
          const rect = element.getBoundingClientRect();
          if (rect.height < 44) {
            issues.push(`${selector} is shorter than 44px`);
          }
        }
      }
      return issues;
    });

    expect(layoutIssues).toEqual([]);
    await expect(page).toHaveScreenshot(`${locale.code}-annual-book.png`);
  });
}
