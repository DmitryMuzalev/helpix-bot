import { useNavigate, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { articleQuery, type Article } from '@/entities/article';
import { ArticleForm } from '@/features/article-editor';
import { WorkspaceHeader } from '@/widgets/workspace-header';
import { ApiError } from '@/shared/api';
import { Skeleton } from '@/shared/ui/skeleton';
import { StatePanel } from '@/shared/ui/StatePanel';
import { Button } from '@/shared/ui/button';

export function ArticleEditorPage() {
  const { articleId } = useParams({ strict: false });
  const selectedId = articleId === undefined ? null : Number(articleId);
  const article = useQuery({ ...articleQuery(selectedId ?? 0), enabled: selectedId !== null });
  const navigate = useNavigate();
  const isNotFound = article.error instanceof ApiError && article.error.status === 404;
  const handleRetry = () => void article.refetch();
  const handleSaved = (savedArticle: Article) =>
    void navigate({
      to: '/articles/$articleId',
      params: { articleId: String(savedArticle.id) },
      replace: true,
    });
  const handleCancel = () =>
    void (selectedId === null
      ? navigate({ to: '/articles' })
      : navigate({ to: '/articles/$articleId', params: { articleId: String(selectedId) } }));

  return (
    <div className="workspace-background min-h-dvh">
      <WorkspaceHeader />
      <main className="mx-auto max-w-4xl px-4 py-7 md:px-8 md:py-10">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {selectedId === null ? 'Новая статья' : 'Редактирование статьи'}
        </h1>
        <p className="mt-2 mb-7 text-sm text-muted-foreground">
          Заполните заголовок и текст инструкции.
        </p>
        {selectedId !== null && article.isPending ? (
          <div role="status" aria-label="Загрузка статьи" className="space-y-5">
            <Skeleton className="h-11" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : selectedId !== null && article.isError && !article.data ? (
          <>
            <StatePanel
              title={isNotFound ? 'Статья не найдена' : 'Статья не загрузилась'}
              description={article.error.message}
              onRetry={isNotFound ? undefined : handleRetry}
            />
            <Button variant="outline" onClick={() => void navigate({ to: '/articles' })}>
              К статьям
            </Button>
          </>
        ) : (
          <div className="rounded-2xl border bg-card/70 p-5 md:p-8">
            {selectedId !== null && article.isError && (
              <p role="status" className="mb-5 text-sm text-destructive">
                Не удалось обновить статью. Введённый текст сохранён в форме.
              </p>
            )}
            <ArticleForm
              key={selectedId ?? 'new'}
              article={selectedId === null ? undefined : article.data}
              onSaved={handleSaved}
              onCancel={handleCancel}
            />
          </div>
        )}
      </main>
    </div>
  );
}
