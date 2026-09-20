import type { SupabaseClient } from 'npm:@supabase/supabase-js@^2';
import type { IncomingSupportMessage, OutgoingSupportMessage } from '../domain/support-message.ts';

const CLIENT_SENDER = 'client';
const BOT_SENDER = 'bot';

export function createTelegramRepository(db: SupabaseClient) {
  return {
    async saveClient(message: IncomingSupportMessage): Promise<number> {
      const { data, error } = await db
        .from('clients')
        .upsert(
          {
            telegram_user_id: message.customerId,
            telegram_chat_id: message.conversationId,
            username: message.username,
            first_name: message.firstName,
            last_name: message.lastName,
          },
          { onConflict: 'telegram_user_id' },
        )
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    },

    async saveIncoming(clientId: number, message: IncomingSupportMessage): Promise<boolean> {
      const { error } = await db.from('messages').insert({
        client_id: clientId,
        telegram_message_id: message.messageId,
        telegram_update_id: message.eventId,
        sender: CLIENT_SENDER,
        message_text: message.text,
        telegram_payload: message.payload,
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
        .contains('telegram_payload', { _reply_to_update_id: eventId })
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
        telegram_payload: { ...message.payload, _reply_to_update_id: eventId },
        sent_at: message.sentAt,
      });

      if (error) throw error;
    },
  };
}
