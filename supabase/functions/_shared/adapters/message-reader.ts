import type { SupabaseClient } from '@supabase/supabase-js';
import type { MessagePageRequest, MessagePosition } from '../domain/message-page.ts';

export function createMessageReader(db: SupabaseClient) {
  return async ({ clientId, cursor }: MessagePageRequest, count: number) => {
    let query = db
      .from('messages')
      .select('*')
      .eq('client_id', clientId)
      .order('sent_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(count);

    if (cursor) {
      query = query.or(
        `sent_at.lt.${cursor.sentAt},and(sent_at.eq.${cursor.sentAt},id.lt.${cursor.id})`,
      );
    }

    const { data, error } = await query.returns<MessagePosition[]>();

    if (error) throw error;
    return data ?? [];
  };
}
