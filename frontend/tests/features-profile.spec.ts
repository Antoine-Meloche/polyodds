import { expect, test } from '@playwright/test';
import { authenticatePage, registerUserViaApi } from './utils/e2e-helpers';

test('profile feature: view own profile page and stats blocks', async ({ page, request }) => {
  const seededUser = await registerUserViaApi(request, 'e2e-profile');
  await authenticatePage(page, seededUser);

  await page.goto(`/profile/${seededUser.user.id}`);
  await expect(page.getByRole('heading', { name: seededUser.user.username })).toBeVisible();
  await expect(page.getByText('Bets créés')).toBeVisible();
  await expect(page.getByText('Bets placés')).toBeVisible();
  await expect(page.getByText('Bets gagnés')).toBeVisible();
});
