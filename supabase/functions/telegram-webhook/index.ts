import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { parseIncomingTelegramMessage } from '../_shared/adapters/telegram-update.ts';
import { handleTelegramMessage } from '../_shared/application/handle-telegram-message.ts';
import { createTelegramDependencies } from '../_shared/infrastructure/telegram-dependencies.ts';

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'POST' },
      });
    }

    const webhookSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!webhookSecret || !botToken) {
      console.error('Telegram webhook secrets are missing');
      return Response.json({ error: 'Webhook is not configured' }, { status: 500 });
    }
    if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== webhookSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let update: unknown;
    try {
      update = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const message = parseIncomingTelegramMessage(update);
    if (!message) return Response.json({ status: 'ignored' });

    try {
      const status = await handleTelegramMessage(
        message,
        createTelegramDependencies(ctx.supabaseAdmin, botToken),
      );
      return Response.json({ status });
    } catch {
      console.error('Failed to process Telegram message');
      return Response.json({ error: 'Unable to process message' }, { status: 500 });
    }
  }),
};
