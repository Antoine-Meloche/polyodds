import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

type AuthSeed = {
  token: string;
  userId: string;
  username: string;
  communityId: string;
  communityName: string;
};

async function seedAuthenticatedUser(request: APIRequestContext): Promise<AuthSeed> {
  const runId = Date.now();
  const username = `e2e-protected-${runId}`;
  const password = 'supersecure-password';
  const communityName = `Protected Community ${runId}`;

  const registerRes = await request.post('/api/auth/register', {
    data: { username, password },
  });
  expect(registerRes.ok()).toBeTruthy();
  const registerBody = await registerRes.json();

  const token = registerBody.token as string;
  const user = registerBody.user as { id: string; username: string; points: number; created_at: string };

  const communityRes = await request.post('/api/communities', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      name: communityName,
      description: 'Seeded by Playwright protected smoke suite',
      is_private: false,
    },
  });
  expect(communityRes.ok()).toBeTruthy();
  const community = (await communityRes.json()) as { id: string; name: string };

  return {
    token,
    userId: user.id,
    username: user.username,
    communityId: community.id,
    communityName: community.name,
  };
}

async function setAuthStorage(page: Page, token: string, user: { id: string; username: string; points: number; created_at: string }) {
  await page.addInitScript(
    ({ authToken, authUser }) => {
      window.localStorage.setItem('auth_token', authToken);
      window.localStorage.setItem('auth_user', JSON.stringify(authUser));
    },
    { authToken: token, authUser: user }
  );
}

async function expectNoRuntimeErrorsOnPath(page: Page, path: string) {
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

test('protected pages render for an authenticated user', async ({ page, request }) => {
  const seed = await seedAuthenticatedUser(request);

  await setAuthStorage(page, seed.token, {
    id: seed.userId,
    username: seed.username,
    points: 1000,
    created_at: new Date().toISOString(),
  });

  await expectNoRuntimeErrorsOnPath(page, `/profile/${seed.userId}`);
  await expect(page.getByRole('heading', { name: seed.username })).toBeVisible();

  await expectNoRuntimeErrorsOnPath(page, '/bets/create');
  await expect(page.getByRole('heading', { name: 'Créer un bet' })).toBeVisible();

  await expectNoRuntimeErrorsOnPath(page, `/communities/${seed.communityId}`);
  await expect(page.getByRole('heading', { name: seed.communityName })).toBeVisible();
});