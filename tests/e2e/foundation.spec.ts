import { expect, test } from '@playwright/test';

test('redirects the entry point to the branded login', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Bem-vindo de volta' }),
  ).toBeVisible();
  await expect(
    page.getByText('Clareza para cuidar. Segurança para servir.'),
  ).toBeVisible();
});

test('exposes the API health check', async ({ request }) => {
  const response = await request.get('http://localhost:3001/health');

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    service: 'api',
    status: 'ok',
  });
});
