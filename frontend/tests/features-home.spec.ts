import { expect, test } from '@playwright/test';
import { authenticatePage, registerUserViaApi } from './utils/e2e-helpers';

test('home feature: authenticated user sees daily claim banner', async ({ page, request }) => {
  const seededUser = await registerUserViaApi(request, 'e2e-home');
  await authenticatePage(page, seededUser);

  await page.goto('/');
  await expect(page.getByText('Bonus quotidien disponible!')).toBeVisible();
  await page.getByRole('button', { name: 'Réclamer' }).click();
});
