import { expect, test } from '@playwright/test';
import { authenticatePage, registerUserViaApi } from './utils/e2e-helpers';

test('daily reward feature: claim once increases points and second claim is blocked', async ({ page, request }) => {
  const seededUser = await registerUserViaApi(request, 'e2e-daily-claim');
  const initialPoints = seededUser.user.points;

  await authenticatePage(page, seededUser);

  await page.goto('/');
  await expect(page.getByText('Bonus quotidien disponible!')).toBeVisible();

  await page.getByRole('button', { name: 'Réclamer' }).click();

  // Banner should disappear once the claim is accepted and auth data refreshes.
  await expect(page.getByText('Bonus quotidien disponible!')).toHaveCount(0);

  const meAfterClaim = await request.get('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${seededUser.token}`,
    },
  });
  expect(meAfterClaim.ok()).toBeTruthy();
  const meAfterClaimBody = await meAfterClaim.json();

  expect(meAfterClaimBody.points).toBe(initialPoints + 100);
  expect(meAfterClaimBody.last_claim_at).toBeTruthy();

  const secondClaim = await request.post('/api/auth/daily-claim', {
    headers: {
      Authorization: `Bearer ${seededUser.token}`,
    },
  });
  expect(secondClaim.status()).toBe(409);
});
