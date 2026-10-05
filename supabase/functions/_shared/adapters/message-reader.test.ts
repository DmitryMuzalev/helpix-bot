import { createClient } from '@supabase/supabase-js';
import { createMessageReader } from './message-reader.ts';
import { parseMessagePageRequest } from '../application/list-client-messages.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test('queries only the selected client in descending order with limit + 1', async () => {
  const rows = [{ id: 2, client_id: 123, sent_at: '2026-10-05T12:00:00Z', message_text: 'Hello' }];
  const db = createClient('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        assert(url.pathname === '/rest/v1/messages', 'Unexpected table');
        assert(url.searchParams.get('select') === '*', 'Message fields were omitted');
        assert(url.searchParams.get('client_id') === 'eq.123', 'Missing client filter');
        assert(url.searchParams.get('order') === 'sent_at.desc,id.desc', 'Unstable ordering');
        assert(url.searchParams.get('limit') === '21', 'Incorrect page size');
        assert(!url.searchParams.has('or'), 'Unexpected cursor filter');
        assert(!url.searchParams.has('offset'), 'Used offset pagination');
        assert(init?.method === 'GET', 'Unexpected method');
        return Response.json(rows);
      },
    },
  });
  const request = parseMessagePageRequest(new URLSearchParams({ client_id: '123' }));
  const result = await createMessageReader(db)(request, request.limit + 1);
  assert(JSON.stringify(result) === JSON.stringify(rows), 'Message fields were lost');
});

Deno.test('cursor filters older timestamps or smaller IDs at the same timestamp', async () => {
  const sentAt = '2026-10-05T12:00:00.123456+00:00';
  const db = createClient('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input) => {
        const url = new URL(String(input));
        assert(url.searchParams.get('client_id') === 'eq.123', 'Lost client filter');
        assert(url.searchParams.get('limit') === '3', 'Incorrect page size');
        assert(
          url.searchParams.get('or') ===
            `(sent_at.lt.${sentAt},and(sent_at.eq.${sentAt},id.lt.10))`,
          'Incorrect cursor filter or timestamp precision',
        );
        return Response.json([]);
      },
    },
  });
  const result = await createMessageReader(db)(
    { clientId: 123, limit: 2, cursor: { clientId: 123, id: 10, sentAt } },
    3,
  );
  assert(result.length === 0, 'Empty page was not returned');
});

Deno.test('database errors are propagated rather than returned as an empty history', async () => {
  const db = createClient('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async () =>
        Response.json({ code: '42501', message: 'Permission denied' }, { status: 403 }),
    },
  });
  const request = parseMessagePageRequest(new URLSearchParams({ client_id: '123' }));
  let error: unknown;
  try {
    await createMessageReader(db)(request, 21);
  } catch (caught) {
    error = caught;
  }
  assert(
    typeof error === 'object' && error !== null && 'code' in error && error.code === '42501',
    'Database failure was swallowed',
  );
});
