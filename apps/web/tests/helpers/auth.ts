import { expect, type BrowserContext, type Page } from '@playwright/test';
import type { Session } from '@supabase/supabase-js';

export const TEST_USER_ID = '11111111-1111-4111-8111-111111111111';

export function makeSession(expiresAt = Math.floor(Date.now() / 1000) + 3600): Session {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: TEST_USER_ID, exp: expiresAt })).toString(
    'base64url',
  );
  return {
    access_token: `${header}.${payload}.test-signature`,
    refresh_token: 'test-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiresAt,
    user: {
      id: TEST_USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'operator@example.com',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      created_at: '2026-10-17T09:00:00Z',
    },
  };
}

export async function seedSession(page: Page, session = makeSession()) {
  await page.addInitScript((nextSession) => {
    localStorage.setItem('sb-127-auth-token', JSON.stringify(nextSession));
  }, session);
}

export async function mockAuth(context: BrowserContext) {
  const state = {
    session: makeSession(),
    signInCount: 0,
    refreshCount: 0,
    signOutCount: 0,
    signInStatus: 200,
    signOutStatus: 204,
    beforeSignIn: null as (() => Promise<void>) | null,
    beforeRefresh: null as (() => Promise<void>) | null,
  };

  await context.route('**/auth/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = { 'Access-Control-Allow-Origin': '*' };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...headers,
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
      });
      return;
    }
    if (url.pathname.endsWith('/token')) {
      if (url.searchParams.get('grant_type') === 'password') {
        expect(request.postDataJSON()).toMatchObject({
          email: 'operator@example.com',
          password: 'test-password',
        });
        state.signInCount += 1;
        await state.beforeSignIn?.();
        if (state.signInStatus !== 200) {
          await route.fulfill({
            status: state.signInStatus,
            headers,
            json: {
              code: 'invalid_credentials',
              error_code: 'invalid_credentials',
              message: 'Invalid login credentials',
            },
          });
          return;
        }
      } else {
        expect(url.searchParams.get('grant_type')).toBe('refresh_token');
        expect(request.postDataJSON()).toEqual({ refresh_token: 'test-refresh-token' });
        state.refreshCount += 1;
        await state.beforeRefresh?.();
      }
      await route.fulfill({ headers, json: state.session });
      return;
    }
    expect(url.pathname).toBe('/auth/v1/logout');
    state.signOutCount += 1;
    await route.fulfill({
      status: state.signOutStatus,
      headers,
      ...(state.signOutStatus === 204 ? {} : { json: { message: 'Sign out failed' } }),
    });
  });
  return state;
}
