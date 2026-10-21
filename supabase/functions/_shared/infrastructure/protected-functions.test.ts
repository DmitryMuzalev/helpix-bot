import clientsFunction from '../../clients/index.ts';
import messagesFunction from '../../messages/index.ts';
import articlesFunction from '../../articles/index.ts';
import telegramFunction from '../../telegram-webhook/index.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function encodeBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

async function createToken(key: CryptoKey, claims: Record<string, unknown> = {}): Promise<string> {
  const encoder = new TextEncoder();
  const header = encodeBase64Url(
    encoder.encode(JSON.stringify({ alg: 'ES256', kid: 'auth-test-key', typ: 'JWT' })),
  );
  const payload = encodeBase64Url(
    encoder.encode(
      JSON.stringify({
        sub: '11111111-1111-4111-8111-111111111111',
        role: 'authenticated',
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
        ...claims,
      }),
    ),
  );
  const unsignedToken = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(unsignedToken),
  );
  return `${unsignedToken}.${encodeBase64Url(new Uint8Array(signature))}`;
}

const protectedEndpoints = [
  { path: 'clients', method: 'GET', handler: clientsFunction, status: 200 },
  { path: 'messages?client_id=1', method: 'GET', handler: messagesFunction, status: 200 },
  { path: 'articles', method: 'GET', handler: articlesFunction, status: 200 },
  { path: 'articles?id=1', method: 'GET', handler: articlesFunction, status: 200 },
  { path: 'articles', method: 'POST', handler: articlesFunction, status: 201 },
  { path: 'articles?id=1', method: 'PUT', handler: articlesFunction, status: 200 },
  { path: 'articles?id=1', method: 'DELETE', handler: articlesFunction, status: 204 },
];

Deno.test('operator APIs require a verified user session before accessing data', async (test) => {
  const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const publicKey = await crypto.subtle.exportKey('jwk', keys.publicKey);
  const environment: Record<string, string> = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: 'sb_publishable_auth-test' }),
    SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'sb_secret_auth-test' }),
    SUPABASE_JWKS: JSON.stringify({
      keys: [{ ...publicKey, alg: 'ES256', kid: 'auth-test-key', use: 'sig' }],
    }),
    TELEGRAM_WEBHOOK_SECRET: 'test-webhook-secret',
    TELEGRAM_BOT_TOKEN: 'test-bot-token',
  };
  const previousEnvironment = new Map(
    Object.keys(environment).map((name) => [name, Deno.env.get(name)]),
  );
  const originalFetch = globalThis.fetch;
  const databaseRequests: Request[] = [];
  const userToken = await createToken(keys.privateKey);

  try {
    for (const [name, value] of Object.entries(environment)) Deno.env.set(name, value);
    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      databaseRequests.push(request);
      const url = new URL(request.url);
      assert(url.origin === environment.SUPABASE_URL, 'Unexpected external request');
      assert(url.pathname.startsWith('/rest/v1/'), 'Unexpected external API');
      if (url.pathname.endsWith('/articles')) {
        assert(
          request.headers.get('Authorization') === 'Bearer sb_secret_auth-test',
          'Article storage must use the server client after authenticating the caller',
        );
        const article = {
          id: 1,
          title: 'Help',
          content: 'Instructions',
          created_at: '2026-10-20T12:00:00Z',
          updated_at: '2026-10-20T12:00:00Z',
        };
        if (request.method === 'GET') {
          return Response.json(url.searchParams.has('id') ? [article] : []);
        }
        return Response.json(request.method === 'DELETE' ? { id: 1 } : article);
      }
      assert(
        request.headers.get('Authorization') === `Bearer ${userToken}`,
        'Support reads must use the caller token so RLS applies',
      );
      return Response.json([]);
    };

    const untrustedKeys = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    const invalidCredentials: { name: string; headers: HeadersInit }[] = [
      { name: 'missing credentials', headers: {} },
      { name: 'a public API key alone', headers: { apikey: 'sb_publishable_auth-test' } },
      {
        name: 'a public key as a bearer token',
        headers: { Authorization: 'Bearer sb_publishable_auth-test' },
      },
      { name: 'a malformed token', headers: { Authorization: 'Bearer invalid-token' } },
      {
        name: 'an expired token',
        headers: {
          Authorization: `Bearer ${await createToken(keys.privateKey, { exp: 1 })}`,
        },
      },
      {
        name: 'a token with an invalid signature',
        headers: { Authorization: `Bearer ${await createToken(untrustedKeys.privateKey)}` },
      },
      {
        name: 'an anonymous key without a user subject',
        headers: {
          Authorization: `Bearer ${await createToken(keys.privateKey, {
            sub: undefined,
            role: 'anon',
          })}`,
        },
      },
    ];

    for (const credentials of invalidCredentials) {
      await test.step(`rejects ${credentials.name} for every operator endpoint`, async () => {
        databaseRequests.length = 0;
        for (const { path, method, handler } of protectedEndpoints) {
          const response = await handler.fetch(
            new Request(`https://example.supabase.co/functions/v1/${path}`, {
              method,
              headers: credentials.headers,
            }),
          );
          assert(response.status === 401, `${method} ${path} accepted ${credentials.name}`);
          assert(
            response.headers.get('Access-Control-Allow-Origin') === '*',
            'Authentication errors need CORS headers',
          );
          await response.body?.cancel();
        }
        assert(databaseRequests.length === 0, 'Unauthenticated request reached the database');
      });
    }

    await test.step('accepts valid user JWTs for reads and article mutations', async () => {
      for (const { path, method, handler, status } of protectedEndpoints) {
        databaseRequests.length = 0;
        const hasBody = method === 'POST' || method === 'PUT';
        const response = await handler.fetch(
          new Request(`https://example.supabase.co/functions/v1/${path}`, {
            method,
            headers: {
              Authorization: `Bearer ${userToken}`,
              'Content-Type': 'application/json',
            },
            ...(hasBody
              ? { body: JSON.stringify({ title: 'Help', content: 'Instructions' }) }
              : {}),
          }),
        );
        assert(response.status === status, `${method} ${path} rejected a valid user`);
        assert(databaseRequests.length === 1, 'Authenticated request did not reach storage');
        await response.body?.cancel();
      }
    });

    await test.step('allows unauthenticated CORS preflight without accessing data', async () => {
      databaseRequests.length = 0;
      for (const handler of [clientsFunction, messagesFunction, articlesFunction]) {
        const response = await handler.fetch(
          new Request('https://example.supabase.co/functions/v1/test', { method: 'OPTIONS' }),
        );
        assert(response.status === 204, 'Preflight requires credentials');
        assert(
          response.headers.get('Access-Control-Allow-Headers')?.includes('authorization'),
          'Preflight does not allow user tokens',
        );
      }
      assert(databaseRequests.length === 0, 'Preflight accessed data');
    });

    await test.step('keeps Telegram authenticated by its webhook secret', async () => {
      databaseRequests.length = 0;
      for (const secret of [undefined, 'wrong-secret', environment.TELEGRAM_WEBHOOK_SECRET]) {
        const response = await telegramFunction.fetch(
          new Request('https://example.supabase.co/functions/v1/telegram-webhook', {
            method: 'POST',
            headers: secret ? { 'X-Telegram-Bot-Api-Secret-Token': secret } : {},
            body: '{}',
          }),
        );
        const hasValidSecret = secret === environment.TELEGRAM_WEBHOOK_SECRET;
        assert(response.status === (hasValidSecret ? 200 : 401), 'Incorrect webhook auth');
        await response.body?.cancel();
      }
      assert(databaseRequests.length === 0, 'Invalid or ignored webhook accessed data');
    });
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of previousEnvironment) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
});
