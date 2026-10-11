import { ApiError, request } from '@/shared/api';
import type { MessagePage } from '../model/types';

export async function getMessages(
  clientId: number,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<MessagePage> {
  const params = new URLSearchParams({ client_id: String(clientId), limit: '20' });
  if (cursor !== null) params.set('cursor', cursor);
  const data = await request('messages', params, signal);
  if (
    typeof data !== 'object' ||
    data === null ||
    !('items' in data) ||
    !Array.isArray(data.items) ||
    !('nextCursor' in data) ||
    (data.nextCursor !== null && typeof data.nextCursor !== 'string')
  ) {
    throw new ApiError('Сервер вернул неожиданный ответ переписки.', 0);
  }
  return data as MessagePage;
}
