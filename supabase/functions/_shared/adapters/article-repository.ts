import type { SupabaseClient } from '@supabase/supabase-js';
import type { ArticleRepository } from '../application/articles.ts';
import type { Article, ArticleSummary } from '../domain/article.ts';

const ARTICLE_SUMMARY_COLUMNS = 'id, title, created_at, updated_at';
const ARTICLE_COLUMNS = 'id, title, content, created_at, updated_at';

export function createArticleRepository(db: SupabaseClient): ArticleRepository {
  return {
    async loadPage(from, to) {
      const { data, error } = await db
        .from('articles')
        .select(ARTICLE_SUMMARY_COLUMNS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to)
        .overrideTypes<ArticleSummary[], { merge: false }>();
      if (error) throw error;
      return data ?? [];
    },

    async findById(id) {
      const { data, error } = await db
        .from('articles')
        .select(ARTICLE_COLUMNS)
        .eq('id', id)
        .maybeSingle<Article>();
      if (error) throw error;
      return data;
    },

    async create(input) {
      const { data, error } = await db
        .from('articles')
        .insert(input)
        .select(ARTICLE_COLUMNS)
        .single<Article>();
      if (error) throw error;
      return data;
    },

    async update(id, input) {
      const { data, error } = await db
        .from('articles')
        .update(input)
        .eq('id', id)
        .select(ARTICLE_COLUMNS)
        .maybeSingle<Article>();
      if (error) throw error;
      return data;
    },

    async remove(id) {
      const { data, error } = await db
        .from('articles')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle<{ id: number }>();
      if (error) throw error;
      return data !== null;
    },
  };
}
