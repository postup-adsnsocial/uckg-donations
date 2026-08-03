import { expect, test } from '@playwright/test';

test('redirects the entry point to the branded login', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/pt-BR\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Bem-vindo de volta' }),
  ).toBeVisible();
  await expect(
    page.getByText('Clareza para cuidar. Segurança para servir.'),
  ).toBeVisible();
});

test('renders the login in Portuguese, English and Spanish', async ({
  page,
}) => {
  const translations = [
    { locale: 'pt-BR', title: 'Bem-vindo de volta' },
    { locale: 'en', title: 'Welcome back' },
    { locale: 'es', title: 'Bienvenido de nuevo' },
  ];

  for (const translation of translations) {
    await page.goto(`/${translation.locale}/login`);
    await expect(
      page.getByRole('heading', { name: translation.title }),
    ).toBeVisible();
  }
});

test('persists the selected language', async ({ page }) => {
  await page.goto('/pt-BR/login');
  await page.getByLabel('Idioma').selectOption('en');

  await expect(page).toHaveURL(/\/en\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Welcome back' }),
  ).toBeVisible();

  await page.goto('/');
  await expect(page).toHaveURL(/\/en\/login$/);
});

test('exposes the API health check', async ({ request }) => {
  const response = await request.get('http://localhost:3001/health');

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    service: 'api',
    status: 'ok',
  });
});
