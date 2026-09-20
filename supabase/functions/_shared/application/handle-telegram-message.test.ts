import {
  handleTelegramMessage,
  type TelegramMessageDependencies,
} from './handle-telegram-message.ts';
import type { IncomingSupportMessage } from '../domain/support-message.ts';

const message: IncomingSupportMessage = {
  eventId: 10,
  messageId: 20,
  conversationId: 30,
  customerId: 30,
  username: null,
  firstName: 'Test',
  lastName: null,
  text: 'My computer is broken',
  kind: 'message',
  sentAt: '2026-01-01T00:00:00.000Z',
};

function createDependencies(
  events: string[],
  isNew: boolean,
  hasReply: boolean,
): TelegramMessageDependencies {
  return {
    async saveClient() {
      events.push('client');
      return 1;
    },
    async saveIncoming() {
      events.push('incoming');
      return isNew;
    },
    async hasReply() {
      events.push('check-reply');
      return hasReply;
    },
    async sendMessage() {
      events.push('send');
      return { messageId: 21, text: 'Reply', sentAt: message.sentAt };
    },
    async saveOutgoing() {
      events.push('outgoing');
    },
  };
}

Deno.test('stores both messages around the Telegram reply', async () => {
  const events: string[] = [];
  const result = await handleTelegramMessage(message, createDependencies(events, true, false));

  if (result !== 'processed' || events.join(',') !== 'client,incoming,send,outgoing') {
    throw new Error(`Unexpected result: ${result}; events: ${events.join(',')}`);
  }
});

Deno.test('does not send a second reply when one is already stored', async () => {
  const events: string[] = [];
  const result = await handleTelegramMessage(message, createDependencies(events, false, true));

  if (result !== 'duplicate' || events.join(',') !== 'client,incoming,check-reply') {
    throw new Error(`Unexpected result: ${result}; events: ${events.join(',')}`);
  }
});

Deno.test('retries a reply missing from storage', async () => {
  const events: string[] = [];
  const result = await handleTelegramMessage(message, createDependencies(events, false, false));

  if (result !== 'processed' || events.join(',') !== 'client,incoming,check-reply,send,outgoing') {
    throw new Error(`Unexpected result: ${result}; events: ${events.join(',')}`);
  }
});
