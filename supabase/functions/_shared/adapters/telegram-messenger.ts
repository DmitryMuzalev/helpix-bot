import type { OutgoingSupportMessage } from '../domain/support-message.ts';
import { isRecord } from './telegram-update.ts';

export function createTelegramMessenger(botToken: string) {
  return {
    async sendMessage(conversationId: number, text: string): Promise<OutgoingSupportMessage> {
      let response: Response;
      try {
        response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          redirect: 'error',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: conversationId, text }),
        });
      } catch {
        throw new Error('Telegram request failed');
      }
      const body: unknown = await response.json();

      if (
        !response.ok ||
        !isRecord(body) ||
        body.ok !== true ||
        !isRecord(body.result) ||
        !Number.isSafeInteger(body.result.message_id) ||
        !Number.isSafeInteger(body.result.date)
      ) {
        throw new Error(`Telegram sendMessage failed with status ${response.status}`);
      }

      return {
        messageId: body.result.message_id as number,
        text,
        sentAt: new Date((body.result.date as number) * 1000).toISOString(),
      };
    },
  };
}
