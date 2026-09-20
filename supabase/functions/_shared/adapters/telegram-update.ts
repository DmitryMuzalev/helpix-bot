import type { IncomingSupportMessage } from '../domain/support-message.ts';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseIncomingTelegramMessage(update: unknown): IncomingSupportMessage | null {
  if (!isRecord(update) || !Number.isSafeInteger(update.update_id)) return null;

  const message = update.message;
  if (!isRecord(message) || !isRecord(message.chat) || !isRecord(message.from)) return null;
  if (message.chat.type !== 'private') return null;
  if (
    !Number.isSafeInteger(message.message_id) ||
    !Number.isSafeInteger(message.date) ||
    !Number.isSafeInteger(message.chat.id) ||
    !Number.isSafeInteger(message.from.id) ||
    typeof message.from.first_name !== 'string'
  ) {
    return null;
  }

  const sentAt = new Date((message.date as number) * 1000);
  if (Number.isNaN(sentAt.getTime())) return null;

  const text = typeof message.text === 'string' ? message.text : null;

  return {
    eventId: update.update_id as number,
    messageId: message.message_id as number,
    conversationId: message.chat.id as number,
    customerId: message.from.id as number,
    username: typeof message.from.username === 'string' ? message.from.username : null,
    firstName: message.from.first_name,
    lastName: typeof message.from.last_name === 'string' ? message.from.last_name : null,
    text,
    kind: text?.startsWith('/start') ? 'start' : 'message',
    sentAt: sentAt.toISOString(),
  };
}
