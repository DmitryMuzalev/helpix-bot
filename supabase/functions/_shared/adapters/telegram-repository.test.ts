import type { SupabaseClient } from '@supabase/supabase-js';
import type { IncomingSupportMessage } from '../domain/support-message.ts';
import { createTelegramRepository } from './telegram-repository.ts';

const message: IncomingSupportMessage = {
  eventId: 10,
  messageId: 20,
  conversationId: 30,
  customerId: 30,
  username: 'customer',
  firstName: 'Test',
  lastName: null,
  text: 'Hello',
  kind: 'message',
  sentAt: '2026-01-01T00:00:00.000Z',
};

type Result = {
  data: { id: number } | null;
  error: { code: string } | null;
};

function createDb(updateResults: Result[], insertResult: Result) {
  const calls: string[] = [];
  const db = {
    from(table: string) {
      if (table !== 'clients') throw new Error(`Unexpected table: ${table}`);
      return {
        update(values: Record<string, unknown>) {
          calls.push(`update:${values.first_name}`);
          return {
            eq(column: string, value: number) {
              if (column !== 'telegram_user_id' || value !== message.customerId) {
                throw new Error('Unexpected update filter');
              }
              return {
                select() {
                  return {
                    async maybeSingle() {
                      const result = updateResults.shift();
                      if (!result) throw new Error('Unexpected update');
                      return result;
                    },
                  };
                },
              };
            },
          };
        },
        insert(values: Record<string, unknown>) {
          if (values.telegram_user_id !== message.customerId) {
            throw new Error('Unexpected inserted user');
          }
          calls.push('insert');
          return {
            select() {
              return {
                async single() {
                  return insertResult;
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;

  return { db, calls };
}

Deno.test('updates an existing client without inserting a row', async () => {
  const { db, calls } = createDb([{ data: { id: 1 }, error: null }], {
    data: null,
    error: null,
  });

  const id = await createTelegramRepository(db).saveClient(message);
  if (id !== 1 || calls.join(',') !== 'update:Test') {
    throw new Error(`Unexpected result: ${id}; calls: ${calls.join(',')}`);
  }
});

Deno.test('inserts a client only when an update finds no row', async () => {
  const { db, calls } = createDb([{ data: null, error: null }], {
    data: { id: 3 },
    error: null,
  });

  const id = await createTelegramRepository(db).saveClient(message);
  if (id !== 3 || calls.join(',') !== 'update:Test,insert') {
    throw new Error(`Unexpected result: ${id}; calls: ${calls.join(',')}`);
  }
});

Deno.test('finds a client inserted concurrently after a unique conflict', async () => {
  const { db, calls } = createDb(
    [
      { data: null, error: null },
      { data: { id: 3 }, error: null },
    ],
    { data: null, error: { code: '23505' } },
  );

  const id = await createTelegramRepository(db).saveClient(message);
  if (id !== 3 || calls.join(',') !== 'update:Test,insert,update:Test') {
    throw new Error(`Unexpected result: ${id}; calls: ${calls.join(',')}`);
  }
});

Deno.test('stores messages without Telegram payload and finds the reply by update ID', async () => {
  const rows: Record<string, unknown>[] = [];
  const filters: [string, unknown][] = [];
  const query = {
    eq(column: string, value: unknown) {
      filters.push([column, value]);
      return query;
    },
    async limit(count: number) {
      if (count !== 1) throw new Error('Unexpected reply lookup limit');
      return { data: [{ id: 2 }], error: null };
    },
  };
  const db = {
    from(table: string) {
      if (table !== 'messages') throw new Error(`Unexpected table: ${table}`);
      return {
        async insert(row: Record<string, unknown>) {
          rows.push(row);
          return { error: null };
        },
        select(column: string) {
          if (column !== 'id') throw new Error('Unexpected reply lookup column');
          return query;
        },
      };
    },
  } as unknown as SupabaseClient;

  const repository = createTelegramRepository(db);
  const isNew = await repository.saveIncoming(1, message);
  const hasReply = await repository.hasReply(1, message.eventId);
  await repository.saveOutgoing(1, message.eventId, {
    messageId: 21,
    text: 'Reply',
    sentAt: message.sentAt,
  });

  if (!isNew || !hasReply || rows.length !== 2) throw new Error('Messages were not saved');
  if (rows.some((row) => 'telegram_payload' in row)) {
    throw new Error('Raw Telegram payload was saved');
  }
  if (
    rows[0].telegram_update_id !== message.eventId ||
    rows[1].reply_to_update_id !== message.eventId
  ) {
    throw new Error('Telegram update and reply are not linked');
  }
  if (
    JSON.stringify(filters) !==
    JSON.stringify([
      ['client_id', 1],
      ['sender', 'bot'],
      ['reply_to_update_id', message.eventId],
    ])
  ) {
    throw new Error(`Unexpected reply lookup: ${JSON.stringify(filters)}`);
  }
});
