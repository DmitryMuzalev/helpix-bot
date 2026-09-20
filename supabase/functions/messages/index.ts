import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { listAllPages } from '../_shared/application/list-all-pages.ts';
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
      const messages = await listAllPages(createMessageReader(ctx.supabaseAdmin));
      return Response.json(messages);
    } catch {
      console.error('Failed to list messages');
      return Response.json({ error: 'Unable to load messages' }, { status: 500 });
    }
  }),
};
