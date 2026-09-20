import console from 'node:console';
import process from 'node:process';
import { URL, URLSearchParams } from 'node:url';

async function main() {
  const required = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'TELEGRAM_WEBHOOK_URL'];
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing .env values: ${missing.join(', ')}`);
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN.trim();
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET.trim();
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL.trim();

  if (!/^[A-Za-z0-9_-]{1,256}$/.test(webhookSecret)) {
    throw new Error('TELEGRAM_WEBHOOK_SECRET has invalid characters or length.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(webhookUrl);
  } catch {
    throw new Error('TELEGRAM_WEBHOOK_URL is not a valid URL.');
  }
  if (
    parsedUrl.protocol !== 'https:' ||
    parsedUrl.pathname !== '/functions/v1/telegram-webhook' ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error('TELEGRAM_WEBHOOK_URL must be the HTTPS URL of telegram-webhook.');
  }

  let response;
  try {
    response = await globalThis.fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      body: new URLSearchParams({ url: webhookUrl, secret_token: webhookSecret }),
      redirect: 'error',
      signal: globalThis.AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error('Could not contact the Telegram API.');
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Telegram returned an invalid response.');
  }

  if (!response.ok || result?.ok !== true) {
    const description =
      typeof result?.description === 'string'
        ? result.description
            .replaceAll(botToken, '[redacted]')
            .replaceAll(webhookSecret, '[redacted]')
        : 'Unknown error';
    throw new Error(`Telegram rejected the webhook (HTTP ${response.status}): ${description}`);
  }

  console.log(`Telegram webhook registered: ${webhookUrl}`);
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
