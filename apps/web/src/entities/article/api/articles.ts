import { ApiError, request } from '@/shared/api';
import type { Article, ArticleInput, ArticleSummary } from '../model/types';

function isArticleSummary(value: unknown): value is ArticleSummary {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    'title' in value &&
    typeof value.title === 'string' &&
    'created_at' in value &&
    typeof value.created_at === 'string' &&
    Number.isFinite(Date.parse(value.created_at)) &&
    'updated_at' in value &&
    typeof value.updated_at === 'string' &&
    Number.isFinite(Date.parse(value.updated_at))
  );
}

function readArticle(value: unknown): Article {
  if (!isArticleSummary(value) || !('content' in value) || typeof value.content !== 'string') {
    throw new ApiError('Сервер вернул неожиданный ответ статьи.', 0);
  }
  return { ...value, content: value.content };
}

export async function getArticles(signal?: AbortSignal): Promise<ArticleSummary[]> {
  const data = await request('articles', new URLSearchParams(), signal);
  if (!Array.isArray(data) || !data.every(isArticleSummary)) {
    throw new ApiError('Сервер вернул неожиданный список статей.', 0);
  }
  return data;
}

export async function getArticle(id: number, signal?: AbortSignal): Promise<Article> {
  return readArticle(await request('articles', new URLSearchParams({ id: String(id) }), signal));
}

export async function createArticle(input: ArticleInput): Promise<Article> {
  return readArticle(
    await request('articles', new URLSearchParams(), undefined, { method: 'POST', body: input }),
  );
}

export async function updateArticle(id: number, input: ArticleInput): Promise<Article> {
  return readArticle(
    await request('articles', new URLSearchParams({ id: String(id) }), undefined, {
      method: 'PUT',
      body: input,
    }),
  );
}

export async function deleteArticle(id: number): Promise<void> {
  await request('articles', new URLSearchParams({ id: String(id) }), undefined, {
    method: 'DELETE',
  });
}
