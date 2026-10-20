import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pencil } from 'lucide-react';
import { ArticleDate, articleQuery } from '@/entities/article';
import { DeleteArticleButton } from '@/features/delete-article';
import { WorkspaceHeader } from '@/widgets/workspace-header';
import { ApiError } from '@/shared/api';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { StatePanel } from '@/shared/ui/StatePanel';

export function ArticlePage() {
  const { articleId } = useParams({ from: '/authenticated/articles/$articleId' });
  const article = useQuery(articleQuery(Number(articleId)));
  const navigate = useNavigate();
  const isNotFound = article.error instanceof ApiError && article.error.status === 404;
  const handleRetry = () => void article.refetch();
  const handleDeleted = () => void navigate({ to: '/articles', replace: true });

  return (
    <div className="workspace-background min-h-dvh">
      <WorkspaceHeader />
      <main className="mx-auto max-w-5xl px-4 py-7 md:px-8 md:py-10">
        <Link
          to="/articles"
          className="mb-6 inline-flex items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />К статьям
        </Link>
        {article.isPending ? (
          <div role="status" aria-label="Загрузка статьи" className="space-y-5">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : article.isError ? (
          <StatePanel
            title={isNotFound ? 'Статья не найдена' : 'Статья не загрузилась'}
            description={article.error.message}
            onRetry={isNotFound ? undefined : handleRetry}
          />
        ) : (
          <article className="rounded-2xl border bg-card/70 p-5 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <h1 className="w-full min-w-0 text-2xl leading-tight font-bold tracking-tight [overflow-wrap:anywhere] sm:w-auto sm:flex-1 md:text-3xl">
                {article.data.title}
              </h1>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link to="/articles/$articleId/edit" params={{ articleId }}>
                    <Pencil aria-hidden="true" />
                    Редактировать
                  </Link>
                </Button>
                <DeleteArticleButton article={article.data} onDeleted={handleDeleted} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs leading-5 text-muted-foreground">
              <span>
                Создано <ArticleDate value={article.data.created_at} />
              </span>
              <span>
                Обновлено <ArticleDate value={article.data.updated_at} />
              </span>
            </div>
            <div className="mt-7 border-t pt-7 text-sm leading-7 whitespace-pre-wrap [overflow-wrap:anywhere] md:text-base md:leading-8">
              {article.data.content}
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
