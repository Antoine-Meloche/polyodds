import { expect, test } from '@playwright/test';
import { registerUserViaApi } from './utils/e2e-helpers';

test('leaderboard feature: render ranking and navigate to profile', async ({ page, request }) => {
  const seededUser = await registerUserViaApi(request, 'e2e-leaderboard');

  await page.goto('/leaderboard');
  await expect(page.getByRole('heading', { name: 'Classement' })).toBeVisible();
  await expect(page.getByRole('link', { name: seededUser.user.username })).toBeVisible();

  await page.getByRole('link', { name: seededUser.user.username }).click();
  await expect(page).toHaveURL(new RegExp(`/profile/${seededUser.user.id}$`));
  await expect(page.getByRole('heading', { name: seededUser.user.username })).toBeVisible();
});
