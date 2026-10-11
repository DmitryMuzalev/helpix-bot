import { ApiError, request } from '@/shared/api';
import type { Client } from '../model/types';

export async function getClients(signal?: AbortSignal): Promise<Client[]> {
  const data = await request('clients', new URLSearchParams(), signal);
  if (!Array.isArray(data)) throw new ApiError('Сервер вернул неожиданный ответ.', 0);
  return (data as Client[]).toSorted((a, b) => {
    const timeA = new Date(a.last_message_at ?? a.created_at).getTime();
    const timeB = new Date(b.last_message_at ?? b.created_at).getTime();
    return timeB - timeA || b.id - a.id;
  });
}
