import type { SupabaseClient } from '@supabase/supabase-js';
import { createArticleRepository } from '../adapters/article-repository.ts';

export function createArticleDependencies(db: SupabaseClient) {
  return { repository: createArticleRepository(db) };
}
