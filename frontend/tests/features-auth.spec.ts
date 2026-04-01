import { expect, test } from '@playwright/test';
import { registerUserViaApi, uniqueSuffix } from './utils/e2e-helpers';

test('auth feature: register and logout from UI', async ({ page }) => {
  const username = `e2e-register-${uniqueSuffix()}`;
  const password = 'supersecure-password';

  await page.goto('/register');
  await page.locator('input[type="text"]').fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: "S'inscrire" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: username })).toBeVisible();

  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await page.waitForFunction(() => !window.localStorage.getItem('auth_token'));
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Connexion à PolyOdds' })).toBeVisible();
});

test('auth feature: login with an existing account', async ({ page, request }) => {
  const seededUser = await registerUserViaApi(request, 'e2e-login');

  await page.goto('/login');
  await page.locator('input[type="text"]').fill(seededUser.user.username);
  await page.locator('input[type="password"]').fill(seededUser.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: seededUser.user.username })).toBeVisible();
});
