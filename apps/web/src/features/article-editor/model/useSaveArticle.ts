import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  articleQuery,
  articlesQuery,
  createArticle,
  updateArticle,
  type ArticleInput,
} from '@/entities/article';

export function useSaveArticle(articleId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ArticleInput) =>
      articleId === null ? createArticle(input) : updateArticle(articleId, input),
    onSuccess: async (article) => {
      const detailKey = articleQuery(article.id).queryKey;
      await queryClient.cancelQueries({ queryKey: detailKey });
      queryClient.setQueryData(detailKey, article);
      await queryClient.invalidateQueries({ queryKey: articlesQuery.queryKey });
    },
  });
}
