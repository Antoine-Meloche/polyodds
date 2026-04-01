import { expect, test } from '@playwright/test';
import {
  authenticatePage,
  createCommunityViaApi,
  registerUserViaApi,
  uniqueSuffix,
} from './utils/e2e-helpers';

test('communities feature: browse communities list', async ({ page, request }) => {
  const seededUser = await registerUserViaApi(request, 'e2e-community-list');
  const communityName = `Browse Community ${uniqueSuffix()}`;
  await createCommunityViaApi(request, seededUser.token, { name: communityName });

  await page.goto('/communities');
  await expect(page.getByRole('heading', { name: 'Communautés', level: 1 })).toBeVisible();
  await expect(page.locator('main').getByText(communityName).first()).toBeVisible();
});

test('communities feature: create community from UI', async ({ page, request }) => {
  const seededUser = await registerUserViaApi(request, 'e2e-community-create');
  await authenticatePage(page, seededUser);

  const communityName = `UI Community ${uniqueSuffix()}`;
  const description = 'Community created from the feature-level Playwright suite';

  await page.goto('/communities/create');
  await page.getByPlaceholder('Ex.: Société technique PolyOrbite').fill(communityName);
  await page.getByPlaceholder("C'est quoi les bets de cette communauté?").fill(description);
  await page.getByRole('button', { name: 'Créer la communauté' }).click();

  await expect(page).toHaveURL(/\/communities\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { name: communityName })).toBeVisible();
  await expect(page.getByText(description)).toBeVisible();
});
