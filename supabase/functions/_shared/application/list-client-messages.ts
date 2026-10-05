import {
  InvalidMessagePageRequest,
  type MessageCursor,
  type MessagePage,
  type MessagePageRequest,
  type MessagePosition,
} from '../domain/message-page.ts';

function positiveInteger(value: string | null, name: string): number {
  if (value === null || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new InvalidMessagePageRequest(`${name} must be a positive safe integer`);
  }
  return Number(value);
}

function validTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match =
    /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(
      value,
    );
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  // Date.parse accepts invalid calendar dates such as February 30.
  const day = new Date(`${match[1]}T00:00:00Z`);
  return day.toISOString().slice(0, 10) === match[1];
}

function decodeCursor(value: string, clientId: number): MessageCursor {
  try {
    if (value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error();
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const cursor: unknown = JSON.parse(atob(base64));
    if (
      typeof cursor !== 'object' ||
      cursor === null ||
      !('clientId' in cursor) ||
      cursor.clientId !== clientId ||
      !('id' in cursor) ||
      typeof cursor.id !== 'number' ||
      !Number.isSafeInteger(cursor.id) ||
      cursor.id <= 0 ||
      !('sentAt' in cursor) ||
      !validTimestamp(cursor.sentAt)
    ) {
      throw new Error();
    }
    return { clientId, id: cursor.id, sentAt: cursor.sentAt };
  } catch {
    throw new InvalidMessagePageRequest('cursor is invalid or belongs to another client');
  }
}

function encodeCursor(cursor: MessageCursor): string {
  return btoa(JSON.stringify(cursor)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function parseMessagePageRequest(params: URLSearchParams): MessagePageRequest {
  const clientId = positiveInteger(params.get('client_id'), 'client_id');
  const limitValue = params.get('limit');
  const limit = limitValue === null ? 20 : positiveInteger(limitValue, 'limit');
  if (limit > 50) throw new InvalidMessagePageRequest('limit must not exceed 50');
  const cursorValue = params.get('cursor');

  return {
    clientId,
    limit,
    cursor: cursorValue === null ? null : decodeCursor(cursorValue, clientId),
  };
}

export async function listClientMessages<T extends MessagePosition>(
  request: MessagePageRequest,
  loadPage: (request: MessagePageRequest, count: number) => Promise<T[]>,
): Promise<MessagePage<T>> {
  const rows = await loadPage(request, request.limit + 1);
  const items = rows.slice(0, request.limit);
  const last = items.at(-1);

  return {
    items,
    nextCursor:
      rows.length > request.limit && last
        ? encodeCursor({ clientId: request.clientId, id: last.id, sentAt: last.sent_at })
        : null,
  };
}
