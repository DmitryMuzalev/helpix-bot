import { test, expect, type Page } from '@playwright/test';
import { makeSession, mockAuth, seedSession } from './helpers/auth';
import { mockRealtime } from './helpers/realtime';

async function mockWorkspace(page: Page) {
  await mockRealtime(page);
  const requests: string[] = [];
  await page.route('**/functions/v1/**', async (route) => {
    const headers = { 'Access-Control-Allow-Origin': '*' };
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: { ...headers, 'Access-Control-Allow-Headers': '*' },
      });
      return;
    }
    requests.push(route.request().url());
    expect(route.request().headers().authorization).toMatch(/^Bearer \S+$/);
    await route.fulfill({ headers, json: [] });
  });
  return requests;
}

async function fillCredentials(page: Page) {
  await page.getByLabel('Email', { exact: true }).fill('operator@example.com');
  await page.getByLabel('Пароль', { exact: true }).fill('test-password');
}

test('redirects guests from private pages without loading their data', async ({
  page,
  context,
}) => {
  await mockAuth(context);
  const requests = await mockWorkspace(page);
  for (const path of [
    '/clients',
    '/clients/1',
    '/articles',
    '/articles/new',
    '/articles/1',
    '/articles/1/edit',
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?/);
    await expect(page.getByRole('heading', { name: 'Вход в Helpix' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Войти', exact: true })).toBeEnabled();
  }
  expect(requests).toHaveLength(0);
});

test('validates credentials, explains sign-in failures and prevents duplicate submissions', async ({
  page,
  context,
}) => {
  const state = await mockAuth(context);
  await mockWorkspace(page);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByText('Введите email.', { exact: true })).toBeVisible();
  await expect(page.getByText('Введите пароль.', { exact: true })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('invalid-email');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByText('Введите корректный email.', { exact: true })).toBeVisible();
  expect(state.signInCount).toBe(0);

  await fillCredentials(page);
  state.signInStatus = 400;
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Неверный email или пароль.');
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('operator@example.com');
  await expect(page.getByLabel('Пароль', { exact: true })).toHaveValue('test-password');

  state.signInStatus = 429;
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Слишком много попыток. Подождите немного и попробуйте снова.',
  );

  state.signInStatus = 200;
  let releaseSignIn = () => {};
  const signInGate = new Promise<void>((resolve) => {
    releaseSignIn = resolve;
  });
  state.beforeSignIn = () => signInGate;
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Входим…' })).toBeDisabled();
  await page.locator('form').evaluate((form: HTMLFormElement) => {
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect.poll(() => state.signInCount).toBe(3);
  releaseSignIn();
  await expect(page).toHaveURL(/\/clients$/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Выйти', exact: true })).toBeVisible();
  expect(state.signInCount).toBe(3);
});

test('returns to the requested internal page after sign-in', async ({ page, context }) => {
  await mockAuth(context);
  await mockWorkspace(page);
  await page.goto('/articles?sort=recent#list');
  await fillCredentials(page);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/\/articles\?sort=recent#list$/);
  await expect(page.getByRole('heading', { name: 'База знаний' })).toBeVisible();
});

test('redirects signed-in users away from login and ignores unsafe return URLs', async ({
  page,
}) => {
  await seedSession(page);
  await mockWorkspace(page);
  for (const redirect of [
    'https://example.com',
    '//example.com/clients',
    '/\\example.com/clients',
    '/login',
    '/articles/../login',
  ]) {
    await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`);
    await expect(page).toHaveURL(/\/clients$/);
    await expect(page.getByRole('button', { name: 'Выйти', exact: true })).toBeVisible();
  }
});

test('clears private data on sign-out, redirects all tabs and protects browser back', async ({
  page,
  context,
}) => {
  await mockAuth(context);
  await mockWorkspace(page);
  await page.goto('/login');
  await fillCredentials(page);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/\/clients$/);
  await page.getByRole('link', { name: 'База знаний', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'База знаний' })).toBeVisible();

  const otherPage = await context.newPage();
  await mockWorkspace(otherPage);
  await otherPage.goto('/clients');
  await expect(otherPage.getByRole('button', { name: 'Выйти', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?/);
  await expect(otherPage).toHaveURL(/\/login\?/);
  const cachedDataCount = await page.evaluate(async () => {
    const modulePath = '/src/app/providers/query-client.ts';
    const { queryClient } = await import(modulePath);
    return queryClient
      .getQueryCache()
      .getAll()
      .filter((query: { queryKey: unknown[] }) => query.queryKey[0] !== 'session').length;
  });
  expect(cachedDataCount).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.getByRole('button', { name: 'Войти', exact: true })).toBeVisible();
});

test('clears the local session even when the server rejects sign-out', async ({
  page,
  context,
}) => {
  const state = await mockAuth(context);
  await seedSession(page);
  await mockWorkspace(page);
  await page.goto('/clients');
  state.signOutStatus = 400;
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.getByRole('button', { name: 'Войти', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('sb-127-auth-token'))).toBeNull();
  expect(state.signOutCount).toBe(1);
});

test('waits for session recovery before loading private pages', async ({ page, context }) => {
  const state = await mockAuth(context);
  let releaseRefresh = () => {};
  const refreshGate = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  state.beforeRefresh = () => refreshGate;
  await seedSession(page, makeSession(Math.floor(Date.now() / 1000) - 60));
  const requests = await mockWorkspace(page);
  await page.goto('/articles');
  await expect.poll(() => state.refreshCount).toBe(1);
  await expect(page.getByRole('status')).toHaveText('Проверяем сессию…');
  expect(requests).toHaveLength(0);
  releaseRefresh();
  await expect(page.getByRole('heading', { name: 'База знаний' })).toBeVisible();
  await expect(page).toHaveURL(/\/articles$/);
});

test('explains missing configuration without showing an unusable form', async ({ page }) => {
  await page.route('**/src/shared/config/api.ts', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: 'export const apiConfig = {};' }),
  );
  await page.goto('/clients');
  await expect(page.getByRole('alert')).toHaveText(
    'Подключение к серверу не настроено. Обратитесь к администратору.',
  );
  await expect(page.getByRole('button', { name: 'Войти', exact: true })).toHaveCount(0);
});

test('shows an accessible login form on mobile without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Пароль', { exact: true })).toHaveAttribute('type', 'password');
  await expect(page.getByRole('button', { name: 'Войти', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'test-results/helpix-login-mobile.png' });
});
