import { createTelegramMessenger } from './telegram-messenger.ts';

Deno.test('does not expose the bot token in a network error', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.reject(
      new Error('Request to https://api.telegram.org/botfake-secret/sendMessage failed'),
    );

  try {
    let errorMessage = '';
    try {
      await createTelegramMessenger('fake-secret').sendMessage(1, 'Hello');
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    if (errorMessage !== 'Telegram request failed') {
      throw new Error(`Unexpected error: ${errorMessage}`);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
