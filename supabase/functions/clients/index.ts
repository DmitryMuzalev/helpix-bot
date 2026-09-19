import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { listAllPages } from '../_shared/application/list-all-pages.ts';
import { createClientReader } from '../_shared/adapters/client-reader.ts';

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    if (req.method !== 'GET') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET' },
      });
    }

    try {
      const clients = await listAllPages(createClientReader(ctx.supabaseAdmin));
      return Response.json(clients);
    } catch (error) {
      console.error('Failed to list clients:', error);
      return Response.json({ error: 'Unable to load clients' }, { status: 500 });
    }
  }),
};
