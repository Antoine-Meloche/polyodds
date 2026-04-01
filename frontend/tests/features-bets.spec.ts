import { expect, test } from '@playwright/test';
import { authenticatePage, createMarketViaApi, registerUserViaApi, uniqueSuffix } from './utils/e2e-helpers';

test('bets feature: authenticated user can place a bet on a market they did not create', async ({ page, request }) => {
  const creator = await registerUserViaApi(request, 'e2e-bet-creator');
  const bettor = await registerUserViaApi(request, 'e2e-bet-user');

  const marketTitle = `Bettable Market ${uniqueSuffix()}`;
  const market = await createMarketViaApi(request, creator.token, {
    title: marketTitle,
    description: 'Market used to validate the place bet flow',
    outcomes: ['Yes', 'No'],
  });

  await authenticatePage(page, bettor);

  await page.goto(`/bets/${market.id}`);
  await expect(page.getByRole('heading', { name: marketTitle })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Placer un bet' })).toBeVisible();

  const betPanel = page.locator('div.app-panel').filter({ has: page.getByRole('heading', { name: 'Placer un bet' }) });

  await betPanel.getByRole('button', { name: 'Yes' }).click();
  await betPanel.locator('input[type="number"]').fill('25');
  const placeBetResponsePromise = page.waitForResponse(
    (response) => response.url().includes(`/api/markets/${market.id}/bet`) && response.request().method() === 'POST'
  );
  await betPanel.getByRole('button', { name: "Confirmer l'achat" }).click();
  const placeBetResponse = await placeBetResponsePromise;
  expect(placeBetResponse.ok(), await placeBetResponse.text()).toBeTruthy();

  await expect(betPanel.getByText("Vous n'avez pas assez de points pour ce bet.")).toHaveCount(0);

  const meAfterBetRes = await request.get('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${bettor.token}`,
    },
  });

  expect(meAfterBetRes.ok()).toBeTruthy();
  const meAfterBet = await meAfterBetRes.json();
  expect(meAfterBet.points).toBe(bettor.user.points - 25);

  const userBetsRes = await request.get(`/api/users/${bettor.user.id}/bets?status=open&limit=50`, {
    headers: {
      Authorization: `Bearer ${bettor.token}`,
    },
  });

  expect(userBetsRes.ok()).toBeTruthy();
  const userBetsBody = await userBetsRes.json();
  expect(Array.isArray(userBetsBody.bets)).toBeTruthy();

  const placedBet = userBetsBody.bets.find(
    (bet: { market_id: string; amount: number }) => bet.market_id === market.id && bet.amount === 25
  );
  expect(placedBet).toBeTruthy();
});
