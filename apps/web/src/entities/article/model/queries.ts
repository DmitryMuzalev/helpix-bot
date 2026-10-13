import { queryOptions } from '@tanstack/react-query';
import { getArticle, getArticles } from '../api/articles';

export const articlesQuery = queryOptions({
  queryKey: ['articles', 'list'],
  queryFn: ({ signal }) => getArticles(signal),
  staleTime: 15_000,
});

export function articleQuery(id: number) {
  return queryOptions({
    queryKey: ['articles', 'detail', id],
    queryFn: ({ signal }) => getArticle(id, signal),
    staleTime: 15_000,
  });
}
