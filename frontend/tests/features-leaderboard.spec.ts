import { expect, test } from '@playwright/test';
import { registerUserViaApi } from './utils/e2e-helpers';

test('leaderboard feature: render ranking and navigate to profile', async ({ page, request }) => {
  await registerUserViaApi(request, 'e2e-leaderboard');

  await page.goto('/leaderboard');
  await expect(page.getByRole('heading', { name: 'Classement' })).toBeVisible();
  const firstProfileLink = page.locator('tbody tr').first().getByRole('link');
  await expect(firstProfileLink).toBeVisible();

  await firstProfileLink.click();
  await expect(page).toHaveURL(/\/profile\/[0-9a-f-]+$/);
  await expect(page.locator('main h1')).toBeVisible();
});
