import type { SupabaseClient } from '@supabase/supabase-js';
import type { IncomingSupportMessage, OutgoingSupportMessage } from '../domain/support-message.ts';

const CLIENT_SENDER = 'client';
const BOT_SENDER = 'bot';

export function createTelegramRepository(db: SupabaseClient) {
  return {
    async saveClient(message: IncomingSupportMessage): Promise<number> {
      const client = {
        telegram_chat_id: message.conversationId,
        username: message.username,
        first_name: message.firstName,
        last_name: message.lastName,
      };

      async function updateExistingClient(): Promise<number | null> {
        const { data, error } = await db
          .from('clients')
          .update(client)
          .eq('telegram_user_id', message.customerId)
          .select('id')
          .maybeSingle();

        if (error) throw error;
        return data?.id ?? null;
      }

      const existingId = await updateExistingClient();
      if (existingId !== null) return existingId;

      const { data, error } = await db
        .from('clients')
        .insert({ ...client, telegram_user_id: message.customerId })
        .select('id')
        .single();

      if (!error) return data.id;
      if (error.code === '23505') {
        // Another request may have inserted this Telegram user after our update.
        const concurrentId = await updateExistingClient();
        if (concurrentId !== null) return concurrentId;
      }
      throw error;
    },

    async saveIncoming(clientId: number, message: IncomingSupportMessage): Promise<boolean> {
      const { error } = await db.from('messages').insert({
        client_id: clientId,
        telegram_message_id: message.messageId,
        telegram_update_id: message.eventId,
        sender: CLIENT_SENDER,
        message_text: message.text,
        sent_at: message.sentAt,
      });

      if (error?.code === '23505') return false;
      if (error) throw error;
      return true;
    },

    async hasReply(clientId: number, eventId: number): Promise<boolean> {
      const { data, error } = await db
        .from('messages')
        .select('id')
        .eq('client_id', clientId)
        .eq('sender', BOT_SENDER)
        .eq('reply_to_update_id', eventId)
        .limit(1);

      if (error) throw error;
      return data.length > 0;
    },

    async saveOutgoing(
      clientId: number,
      eventId: number,
      message: OutgoingSupportMessage,
    ): Promise<void> {
      const { error } = await db.from('messages').insert({
        client_id: clientId,
        telegram_message_id: message.messageId,
        sender: BOT_SENDER,
        message_text: message.text,
        reply_to_update_id: eventId,
        sent_at: message.sentAt,
      });

      if (error) throw error;
    },
  };
}
