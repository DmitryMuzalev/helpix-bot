import { test, expect, type Page } from '@playwright/test';
import { TEST_USER_ID, makeSession, mockAuth } from './helpers/auth';

const AUTH_FIXTURE_URL = '/tests/fixtures/auth.html';

async function expectUser(page: Page, userId: string | null) {
  await expect
    .poll(() => page.getByTestId('auth-state').textContent())
    .toContain(`"userId":${JSON.stringify(userId)}`);
  await expect(page.getByTestId('auth-state')).toContainText('"isLoading":false');
}

test('tracks sign-in, restores the session after reload and clears it on sign-out', async ({
  page,
  context,
}) => {
  const state = await mockAuth(context);
  await page.goto(AUTH_FIXTURE_URL);
  await expectUser(page, null);
  await expect(page.getByTestId('auth-state')).toContainText('"isConfigured":true');
  await expect(page.getByTestId('auth-state')).toContainText('"hasSharedRealtimeClient":true');

  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expectUser(page, TEST_USER_ID);
  await expect(page.getByTestId('auth-state')).toContainText('operator@example.com');

  await page.reload();
  await expectUser(page, TEST_USER_ID);
  expect(state.signInCount).toBe(1);
  expect(state.refreshCount).toBe(0);

  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expectUser(page, null);
  await page.reload();
  await expectUser(page, null);
  expect(state.signOutCount).toBe(1);
});

test('waits for token refresh on startup and synchronizes sign-out across tabs', async ({
  page,
  context,
}) => {
  const state = await mockAuth(context);
  let releaseRefresh = () => {};
  const refreshGate = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  state.beforeRefresh = () => refreshGate;
  await page.addInitScript(
    (session) => {
      localStorage.setItem('sb-127-auth-token', JSON.stringify(session));
    },
    makeSession(Math.floor(Date.now() / 1000) - 60),
  );

  await page.goto(AUTH_FIXTURE_URL);
  await expect.poll(() => state.refreshCount).toBe(1);
  await expect(page.getByTestId('auth-state')).toContainText('"isLoading":true');
  releaseRefresh();
  await expectUser(page, TEST_USER_ID);
  await expect(page.getByTestId('auth-state')).toContainText(
    `"expiresAt":${state.session.expires_at}`,
  );

  const otherPage = await context.newPage();
  await otherPage.goto(AUTH_FIXTURE_URL);
  await expectUser(otherPage, TEST_USER_ID);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expectUser(page, null);
  await expectUser(otherPage, null);
});

test('finishes loading when Supabase is not configured', async ({ page }) => {
  await page.route('**/src/shared/config/api.ts', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: 'export const apiConfig = {};' }),
  );
  await page.goto(AUTH_FIXTURE_URL);
  await expectUser(page, null);
  await expect(page.getByTestId('auth-state')).toContainText('"isConfigured":false');
});

test('does not restore an old session when an earlier read finishes after sign-out', async ({
  page,
  context,
}) => {
  await mockAuth(context);
  await page.goto(AUTH_FIXTURE_URL);
  await expectUser(page, null);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expectUser(page, TEST_USER_ID);

  await page.evaluate(async () => {
    const apiModulePath = '/src/shared/api/index.ts';
    const queryModulePath = '/src/entities/session/model/queries.ts';
    const clientModulePath = '/src/app/providers/query-client.ts';
    const { getSupabaseClient } = await import(apiModulePath);
    const { sessionQuery } = await import(queryModulePath);
    const { queryClient } = await import(clientModulePath);
    const supabaseClient = getSupabaseClient();
    const getSession = supabaseClient.auth.getSession.bind(supabaseClient.auth);
    const gate = new Promise<void>((resolve) => {
      window.addEventListener('release-session-read', () => resolve(), { once: true });
    });

    // Capture the signed-in session and delay returning it to the query.
    await new Promise<void>((resolve) => {
      supabaseClient.auth.getSession = async () => {
        const result = await getSession();
        supabaseClient.auth.getSession = getSession;
        resolve();
        await gate;
        return result;
      };
      void queryClient.fetchQuery({ ...sessionQuery, staleTime: 0 });
    });
  });

  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expectUser(page, null);
  const cachedUserId = await page.evaluate(async () => {
    const clientModulePath = '/src/app/providers/query-client.ts';
    const { queryClient } = await import(clientModulePath);
    window.dispatchEvent(new Event('release-session-read'));
    // Let the delayed read and the query's completion handlers settle.
    await new Promise((resolve) => setTimeout(resolve, 0));
    return queryClient.getQueryData(['session'])?.user?.id ?? null;
  });
  expect(cachedUserId).toBeNull();
  await expectUser(page, null);
});
