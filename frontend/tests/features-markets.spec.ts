import { expect, test } from '@playwright/test';
import {
  authenticatePage,
  createMarketViaApi,
  registerUserViaApi,
  uniqueSuffix,
} from './utils/e2e-helpers';

test('markets feature: browse market list and open detail', async ({ page, request }) => {
  const seededUser = await registerUserViaApi(request, 'e2e-market-list');
  const marketTitle = `Browse Market ${uniqueSuffix()}`;
  const market = await createMarketViaApi(request, seededUser.token, {
    title: marketTitle,
    description: 'Seeded market for list feature coverage',
  });

  await page.goto('/bets');
  await expect(page.getByRole('heading', { name: 'Bets' })).toBeVisible();
  await page.getByText(marketTitle).first().click();

  await expect(page).toHaveURL(new RegExp(`/bets/${market.id}$`));
  await expect(page.getByRole('heading', { name: marketTitle })).toBeVisible();
});

test('markets feature: create market from UI', async ({ page, request }) => {
  const seededUser = await registerUserViaApi(request, 'e2e-market-create');
  await authenticatePage(page, seededUser);

  const marketTitle = `UI Market ${uniqueSuffix()}`;
  const marketDescription = 'Market created from the feature-level Playwright suite';

  await page.goto('/bets/create');
  await page.getByPlaceholder('Ex.: Quel sera la moyenne du promo 2025 en fin de session?').fill(marketTitle);
  await page.getByPlaceholder('Fournissez des détails sur ce bet...').fill(marketDescription);
  await page.locator('select').first().selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Create Bet' }).click();

  await expect(page).toHaveURL(/\/bets\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { name: marketTitle })).toBeVisible();
  await expect(page.getByText(marketDescription)).toBeVisible();
});
