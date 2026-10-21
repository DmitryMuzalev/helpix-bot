import { expect, test, type Page } from '@playwright/test';
import { makeSession, mockAuth, seedSession } from './helpers/auth';

async function requestClients(page: Page) {
  return page.evaluate(async () => {
    const modulePath = '/src/shared/api/http-client.ts';
    const { request } = await import(modulePath);
    try {
      await request('clients', new URLSearchParams());
      return { status: 200 };
    } catch (error) {
      return { status: (error as { status: number }).status };
    }
  });
}

async function mockClients(page: Page) {
  const requests: string[] = [];
  await page.route('**/functions/v1/clients', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
      });
      return;
    }
    requests.push(route.request().headers().authorization ?? '');
    await route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, json: [] });
  });
  return requests;
}

test('sends the signed-in user token to the data API', async ({ page }) => {
  const session = makeSession();
  await seedSession(page, session);
  const requests = await mockClients(page);
  await page.goto('/tests/fixtures/auth.html');
  expect(await requestClients(page)).toEqual({ status: 200 });
  expect(requests).toEqual([`Bearer ${session.access_token}`]);
});

test('blocks API requests without a session and after signing out', async ({ page, context }) => {
  await mockAuth(context);
  const requests = await mockClients(page);
  await page.goto('/tests/fixtures/auth.html');
  expect(await requestClients(page)).toEqual({ status: 401 });
  expect(requests).toHaveLength(0);

  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByTestId('auth-state')).toContainText('operator@example.com');
  expect(await requestClients(page)).toEqual({ status: 200 });
  expect(requests).toHaveLength(1);

  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByTestId('auth-state')).toContainText('"userId":null');
  expect(await requestClients(page)).toEqual({ status: 401 });
  expect(requests).toHaveLength(1);
});

test('waits for token refresh and sends the refreshed token', async ({ page, context }) => {
  const state = await mockAuth(context);
  let releaseRefresh = () => {};
  const refreshGate = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  state.beforeRefresh = () => refreshGate;
  await seedSession(page, makeSession(Math.floor(Date.now() / 1000) - 60));
  const requests = await mockClients(page);
  await page.goto('/tests/fixtures/auth.html');
  await expect.poll(() => state.refreshCount).toBe(1);
  const pendingRequest = requestClients(page);
  expect(requests).toHaveLength(0);
  releaseRefresh();
  expect(await pendingRequest).toEqual({ status: 200 });
  expect(requests).toEqual([`Bearer ${state.session.access_token}`]);
});
