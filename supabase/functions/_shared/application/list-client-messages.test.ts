import { listClientMessages, parseMessagePageRequest } from './list-client-messages.ts';
import {
  InvalidMessagePageRequest,
  type MessagePageRequest,
  type MessagePosition,
} from '../domain/message-page.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function cursor(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.test('defaults to 20 messages and accepts limits from 1 to 50', () => {
  const request = parseMessagePageRequest(new URLSearchParams({ client_id: '123' }));
  assert(
    request.clientId === 123 && request.limit === 20 && request.cursor === null,
    'Bad defaults',
  );
  for (const limit of ['1', '50']) {
    const parsed = parseMessagePageRequest(new URLSearchParams({ client_id: '123', limit }));
    assert(parsed.limit === Number(limit), 'Valid limit was rejected');
  }
});

Deno.test('rejects missing, malformed and out-of-range parameters', () => {
  const invalid = [
    '',
    'limit=20',
    ...['', '0', '-1', '1.5', '1e2', 'abc', '9007199254740992'].map((id) => `client_id=${id}`),
    ...['', '0', '-1', '1.5', '21abc', '51', '9007199254740992'].map(
      (limit) => `client_id=123&limit=${limit}`,
    ),
  ];
  for (const params of invalid) {
    let error: unknown;
    try {
      parseMessagePageRequest(new URLSearchParams(params));
    } catch (caught) {
      error = caught;
    }
    assert(error instanceof InvalidMessagePageRequest, `Accepted invalid parameters: ${params}`);
  }
});

Deno.test('rejects malformed cursors, invalid dates and cursors from another client', () => {
  const valid = { clientId: 123, id: 10, sentAt: '2026-10-05T12:00:00.123456+00:00' };
  const invalid = [
    '',
    'not-a-cursor',
    'a'.repeat(513),
    cursor(null),
    cursor([]),
    cursor({}),
    cursor({ ...valid, clientId: 456 }),
    cursor({ ...valid, id: 0 }),
    cursor({ ...valid, id: 1.5 }),
    cursor({ ...valid, id: '10' }),
    cursor({ ...valid, id: 9007199254740992 }),
    cursor({ ...valid, sentAt: '2026-02-30T12:00:00Z' }),
    cursor({ ...valid, sentAt: '2026-10-05T24:00:00Z' }),
    cursor({ ...valid, sentAt: '2026-10-05T12:00:00' }),
    cursor({ ...valid, sentAt: '2026-10-05T12:00:00Z),id.gt.0' }),
  ];
  for (const value of invalid) {
    let error: unknown;
    try {
      parseMessagePageRequest(new URLSearchParams({ client_id: '123', cursor: value }));
    } catch (caught) {
      error = caught;
    }
    assert(error instanceof InvalidMessagePageRequest, `Accepted invalid cursor: ${value}`);
  }

  const parsed = parseMessagePageRequest(
    new URLSearchParams({ client_id: '123', cursor: cursor(valid) }),
  );
  assert(parsed.cursor?.sentAt === valid.sentAt, 'Cursor lost timestamp precision');
});

Deno.test('uses the last returned message for the cursor, excluding the extra row', async () => {
  const rows = [3, 2, 1].map((id) => ({
    id,
    sent_at: '2026-10-05T12:00:00.123456+00:00',
    message_text: `Message ${id}`,
  }));
  const request = parseMessagePageRequest(new URLSearchParams({ client_id: '123', limit: '2' }));
  const page = await listClientMessages(request, async (received, count) => {
    assert(received === request && count === 3, 'Did not request limit + 1');
    return rows;
  });
  assert(page.items.length === 2 && page.items[1].id === 2, 'Extra row leaked into the response');
  assert(page.items[0].message_text === 'Message 3', 'Message fields were lost');
  assert(page.nextCursor !== null, 'Missing next cursor');
  const next = parseMessagePageRequest(
    new URLSearchParams({ client_id: '123', limit: '2', cursor: page.nextCursor }),
  );
  assert(
    next.cursor?.id === 2 && next.cursor.sentAt === rows[1].sent_at,
    'Incorrect cursor position',
  );
});

Deno.test(
  'returns a null cursor for empty and final pages, including exactly limit rows',
  async () => {
    const request = parseMessagePageRequest(new URLSearchParams({ client_id: '123', limit: '2' }));
    for (const count of [0, 1, 2]) {
      const rows = Array.from({ length: count }, (_, index) => ({
        id: count - index,
        sent_at: '2026-10-05T12:00:00Z',
      }));
      const page = await listClientMessages(request, async () => rows);
      assert(page.items.length === count && page.nextCursor === null, 'Incorrect final page');
    }
  },
);

Deno.test(
  'pages tied timestamps without gaps or duplicates despite a newer insertion',
  async () => {
    const rows: MessagePosition[] = [5, 4, 3, 2, 1].map((id) => ({
      id,
      sent_at: '2026-10-05T12:00:00Z',
    }));
    const loadPage = async (request: MessagePageRequest, count: number) => {
      const position = request.cursor;
      return rows
        .filter(
          (row) =>
            !position ||
            row.sent_at < position.sentAt ||
            (row.sent_at === position.sentAt && row.id < position.id),
        )
        .slice(0, count);
    };
    const params = new URLSearchParams({ client_id: '123', limit: '2' });
    const ids: number[] = [];
    let page = await listClientMessages(parseMessagePageRequest(params), loadPage);
    ids.push(...page.items.map((item) => item.id));
    rows.unshift({ id: 6, sent_at: '2026-10-05T12:01:00Z' });
    while (page.nextCursor) {
      params.set('cursor', page.nextCursor);
      page = await listClientMessages(parseMessagePageRequest(params), loadPage);
      ids.push(...page.items.map((item) => item.id));
    }
    assert(ids.join(',') === '5,4,3,2,1', `Unexpected history: ${ids.join(',')}`);
  },
);

Deno.test('propagates database failures', async () => {
  const failure = new Error('Database unavailable');
  const request = parseMessagePageRequest(new URLSearchParams({ client_id: '123' }));
  let error: unknown;
  try {
    await listClientMessages(request, async () => {
      throw failure;
    });
  } catch (caught) {
    error = caught;
  }
  assert(error === failure, 'Database failure was swallowed');
});
