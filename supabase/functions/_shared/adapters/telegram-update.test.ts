import { createReplyText } from '../domain/support-message.ts';
import { parseIncomingTelegramMessage } from './telegram-update.ts';

Deno.test('maps a private Telegram start message to a support message', () => {
  const message = parseIncomingTelegramMessage({
    update_id: 10,
    message: {
      message_id: 20,
      date: 1_700_000_000,
      chat: { id: 30, type: 'private' },
      from: { id: 30, first_name: 'Test' },
      text: '/start',
    },
  });

  if (!message || message.kind !== 'start' || message.customerId !== 30) {
    throw new Error('Telegram start message was not mapped correctly');
  }
  if (!createReplyText(message).startsWith('Здравствуйте!')) {
    throw new Error('Start message did not get the greeting');
  }
});

Deno.test('ignores messages from group chats', () => {
  const message = parseIncomingTelegramMessage({
    update_id: 10,
    message: {
      message_id: 20,
      date: 1_700_000_000,
      chat: { id: 30, type: 'group' },
      from: { id: 31, first_name: 'Test' },
      text: 'Hello',
    },
  });

  if (message !== null) throw new Error('Group message should be ignored');
});
