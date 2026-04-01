import { expect, test } from '@playwright/test';

test('user can register and create a community against the live backend', async ({ page }) => {
  const runId = Date.now();
  const username = `e2e-user-${runId}`;
  const password = 'supersecure-password';
  const communityName = `E2E Community ${runId}`;
  const communityDescription = 'Created by Playwright against the Rust backend';

  await page.goto('/register');

  await page.locator('input[type="text"]').fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: "S'inscrire" }).click();

  await expect(page).toHaveURL(/\/$/);

  await page.goto('/communities/create');
  await page.getByPlaceholder('Ex.: Société technique PolyOrbite').fill(communityName);
  await page.getByPlaceholder("C'est quoi les bets de cette communauté?").fill(communityDescription);
  await page.getByRole('button', { name: 'Créer la communauté' }).click();

  await expect(page).toHaveURL(/\/communities\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { name: communityName })).toBeVisible();
  await expect(page.getByText(communityDescription)).toBeVisible();
  await expect(page.getByText('1 membres')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Quitter' })).toBeVisible();
});