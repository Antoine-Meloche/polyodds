import { expect, test } from '@playwright/test';

async function expectNoRuntimeErrors(page: import('@playwright/test').Page, path: string) {
  const runtimeErrors: string[] = [];

  page.on('pageerror', (error) => {
    runtimeErrors.push(error.message);
  });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeErrors.push(message.text());
    }
  });

  await page.goto(path);
  await expect(page.locator('body')).toBeVisible();
  await page.waitForTimeout(400);

  expect(runtimeErrors, `runtime errors on ${path}`).toEqual([]);
}

test('public pages render without runtime errors', async ({ page }) => {
  await expectNoRuntimeErrors(page, '/');
  await expectNoRuntimeErrors(page, '/bets');
  await expectNoRuntimeErrors(page, '/leaderboard');
  await expectNoRuntimeErrors(page, '/login');
  await expectNoRuntimeErrors(page, '/register');
});