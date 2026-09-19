import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { listMessages } from '../_shared/application/list-messages.ts';
import { createMessageReader } from '../_shared/adapters/message-reader.ts';

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    if (req.method !== 'GET') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET' },
      });
    }

    try {
      const messages = await listMessages(createMessageReader(ctx.supabaseAdmin));
      return Response.json(messages);
    } catch (error) {
      console.error('Failed to list messages:', error);
      return Response.json({ error: 'Unable to load messages' }, { status: 500 });
    }
  }),
};
