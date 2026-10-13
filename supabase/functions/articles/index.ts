import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { handleArticlesRequest } from '../_shared/adapters/article-handler.ts';
import { createArticleDependencies } from '../_shared/infrastructure/article-dependencies.ts';

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    const { repository } = createArticleDependencies(ctx.supabaseAdmin);
    return handleArticlesRequest(req, repository);
  }),
};
