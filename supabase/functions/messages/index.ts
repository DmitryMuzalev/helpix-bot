import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import {
  listClientMessages,
  parseMessagePageRequest,
} from '../_shared/application/list-client-messages.ts';
import { InvalidMessagePageRequest } from '../_shared/domain/message-page.ts';
import { createMessageDependencies } from '../_shared/infrastructure/message-dependencies.ts';

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    if (req.method !== 'GET') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET' },
      });
    }

    try {
      const request = parseMessagePageRequest(new URL(req.url).searchParams);
      const { loadPage } = createMessageDependencies(ctx.supabaseAdmin);
      const messages = await listClientMessages(request, loadPage);
      return Response.json(messages);
    } catch (error) {
      if (error instanceof InvalidMessagePageRequest) {
        return Response.json({ error: error.message }, { status: 400 });
      }
      console.error('Failed to list messages');
      return Response.json({ error: 'Unable to load messages' }, { status: 500 });
    }
  }),
};
