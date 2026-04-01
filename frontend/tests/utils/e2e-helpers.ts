import { expect, type APIRequestContext, type Page } from '@playwright/test';

type SeedUser = {
  token: string;
  user: {
    id: string;
    username: string;
    points: number;
    created_at: string;
    last_claim_at?: string | null;
  };
  password: string;
};

export const uniqueSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const shortUniqueSuffix = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function registerUserViaApi(request: APIRequestContext, prefix: string): Promise<SeedUser> {
  const password = 'supersecure-password';
  const normalizedPrefix = prefix.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 14);
  const username = `${normalizedPrefix}-${shortUniqueSuffix()}`.slice(0, 32);

  const registerRes = await request.post('/api/auth/register', {
    data: { username, password },
  });

  expect(registerRes.ok(), await registerRes.text()).toBeTruthy();

  const body = await registerRes.json();
  return {
    token: body.token,
    user: body.user,
    password,
  };
}

export async function firstCategoryId(request: APIRequestContext): Promise<string> {
  const categoriesRes = await request.get('/api/categories');
  expect(categoriesRes.ok()).toBeTruthy();
  const categoriesBody = await categoriesRes.json();
  const firstCategory = categoriesBody.categories?.[0];
  expect(firstCategory?.id).toBeTruthy();
  return firstCategory.id as string;
}

export async function createMarketViaApi(
  request: APIRequestContext,
  token: string,
  data?: {
    title?: string;
    description?: string;
    category_id?: string;
    outcomes?: string[];
  }
) {
  const category_id = data?.category_id ?? (await firstCategoryId(request));
  const title = data?.title ?? `Market ${uniqueSuffix()}`;
  const description = data?.description ?? 'Market created by feature tests';

  const response = await request.post('/api/markets', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      title,
      description,
      category_id,
      outcomes: data?.outcomes ?? ['Yes', 'No'],
    },
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function authenticatePage(page: Page, seedUser: SeedUser) {
  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem('auth_token', token);
      window.localStorage.setItem('auth_user', JSON.stringify(user));
    },
    { token: seedUser.token, user: seedUser.user }
  );
}

export async function expectNoRuntimeErrors(page: Page, path: string) {
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
  await page.waitForTimeout(300);

  expect(runtimeErrors, `runtime errors on ${path}`).toEqual([]);
}
