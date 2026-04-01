import { expect, test } from '@playwright/test';
import { authenticatePage, createMarketViaApi, registerUserViaApi, uniqueSuffix } from './utils/e2e-helpers';

test('market management: creator can delete open market and bettors are refunded', async ({ page, request }) => {
  const creator = await registerUserViaApi(request, 'e2e-del-creator');
  const bettor = await registerUserViaApi(request, 'e2e-del-bettor');

  const marketTitle = `Delete Flow ${uniqueSuffix()}`;
  const market = await createMarketViaApi(request, creator.token, {
    title: marketTitle,
    description: 'Market used to validate creator deletion with refunds',
    outcomes: ['Yes', 'No'],
  });

  const placeBetRes = await request.post(`/api/markets/${market.id}/bet`, {
    headers: {
      Authorization: `Bearer ${bettor.token}`,
    },
    data: {
      outcome_index: 0,
      amount: 40,
      side: 'buy',
    },
  });

  expect(placeBetRes.ok(), await placeBetRes.text()).toBeTruthy();

  const meAfterBetRes = await request.get('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${bettor.token}`,
    },
  });
  expect(meAfterBetRes.ok()).toBeTruthy();
  const meAfterBet = await meAfterBetRes.json();

  await authenticatePage(page, creator);

  page.once('dialog', (dialog) => {
    dialog.accept();
  });

  await page.goto(`/bets/${market.id}`);
  await expect(page.getByRole('heading', { name: marketTitle })).toBeVisible();

  const deleteResponsePromise = page.waitForResponse(
    (response) => response.url().includes(`/api/markets/${market.id}`) && response.request().method() === 'DELETE'
  );

  await page.getByRole('button', { name: 'Supprimer le marché' }).click();

  const deleteResponse = await deleteResponsePromise;
  expect(deleteResponse.ok(), await deleteResponse.text()).toBeTruthy();

  await expect(page).toHaveURL(/\/bets$/);
  await expect(page.getByText(marketTitle)).toHaveCount(0);

  const getDeletedMarketRes = await request.get(`/api/markets/${market.id}`);
  expect(getDeletedMarketRes.status()).toBe(404);

  const meAfterDeleteRes = await request.get('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${bettor.token}`,
    },
  });

  expect(meAfterDeleteRes.ok()).toBeTruthy();
  const meAfterDelete = await meAfterDeleteRes.json();
  expect(meAfterDelete.points).toBeGreaterThan(meAfterBet.points);
});

test('market management: sidebar only lists active own markets', async ({ page, request }) => {
  const creator = await registerUserViaApi(request, 'e2e-side-own');

  const activeTitle = `Sidebar Active ${uniqueSuffix()}`;
  const resolvedTitle = `Sidebar Resolved ${uniqueSuffix()}`;

  const activeMarket = await createMarketViaApi(request, creator.token, {
    title: activeTitle,
    outcomes: ['Yes', 'No'],
  });

  const resolvedMarket = await createMarketViaApi(request, creator.token, {
    title: resolvedTitle,
    outcomes: ['Yes', 'No'],
  });

  const resolveRes = await request.post(`/api/markets/${resolvedMarket.id}/resolve`, {
    headers: {
      Authorization: `Bearer ${creator.token}`,
    },
    data: {
      winning_outcome_index: 0,
    },
  });

  expect(resolveRes.ok(), await resolveRes.text()).toBeTruthy();

  await authenticatePage(page, creator);
  await page.goto('/');

  const sidebar = page.locator('aside');

  await expect(sidebar.getByRole('link', { name: activeTitle, exact: true })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: resolvedTitle, exact: true })).toHaveCount(0);

  const ownMarketsBadge = sidebar.locator('h3:has-text("Mes marchés")').locator('..').locator('span');
  await expect(ownMarketsBadge).toContainText('1');

  await page.goto(`/bets/${activeMarket.id}`);
  await expect(page.getByRole('heading', { name: activeTitle })).toBeVisible();
});
