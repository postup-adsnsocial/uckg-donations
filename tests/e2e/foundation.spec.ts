import { expect, test } from '@playwright/test';

test('renders the Marco 0 landing page', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'UCKG Donations' }),
  ).toBeVisible();
  await expect(page.getByText('A fundação técnica está pronta')).toBeVisible();
});

test('exposes the API health check', async ({ request }) => {
  const response = await request.get('http://localhost:3001/health');

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    service: 'api',
    status: 'ok',
  });
});
