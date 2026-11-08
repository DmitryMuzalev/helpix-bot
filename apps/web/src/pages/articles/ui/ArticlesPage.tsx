import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, BookOpen, Plus } from 'lucide-react';
import { ArticleDate, articlesQuery } from '@/entities/article';
import { WorkspaceHeader } from '@/widgets/workspace-header';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { StatePanel } from '@/shared/ui/StatePanel';

export function ArticlesPage() {
  const articles = useQuery(articlesQuery);
  const handleRetry = () => void articles.refetch();

  return (
    <div className="workspace-background workspace-frame">
      <WorkspaceHeader />
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-medium md:text-2xl">База знаний</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Инструкции и решения для технической поддержки.
            </p>
          </div>
          <Button asChild>
            <Link to="/articles/new">
              <Plus aria-hidden="true" />
              Создать статью
            </Link>
          </Button>
        </div>
        {articles.isPending ? (
          <div role="status" aria-label="Загрузка статей" className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : articles.isError && !articles.data ? (
          <StatePanel
            title="Статьи не загрузились"
            description={articles.error.message}
            onRetry={handleRetry}
          />
        ) : articles.data?.length === 0 ? (
          <div className="rounded-xl bg-card">
            <StatePanel
              icon={BookOpen}
              title="Пока нет статей"
              description="Создайте первую инструкцию — она появится в базе знаний."
            />
          </div>
        ) : (
          <nav aria-label="Список статей" className="space-y-3">
            {articles.data?.map((article) => (
              <Link
                key={article.id}
                to="/articles/$articleId"
                params={{ articleId: String(article.id) }}
                className="group flex items-center gap-3 rounded-xl border border-transparent bg-card p-4 transition-colors hover:border-primary/60 hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-ring md:p-5"
              >
                <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-highlight sm:flex">
                  <BookOpen className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-medium md:text-base">{article.title}</h2>
                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    Обновлено <ArticleDate value={article.updated_at} />
                  </p>
                </div>
                <ArrowUpRight
                  className="size-4 shrink-0 text-muted-foreground group-hover:text-highlight"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </nav>
        )}
        {articles.isError && articles.data && (
          <p role="status" className="mt-4 text-sm text-destructive">
            Не удалось обновить список. Показываем сохранённые данные.
          </p>
        )}
      </main>
    </div>
  );
}
