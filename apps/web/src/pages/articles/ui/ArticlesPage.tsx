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
    <div className="workspace-background min-h-dvh">
      <WorkspaceHeader />
      <main className="mx-auto max-w-5xl px-4 py-7 md:px-8 md:py-10">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">База знаний</h1>
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
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : articles.isError && !articles.data ? (
          <StatePanel
            title="Статьи не загрузились"
            description={articles.error.message}
            onRetry={handleRetry}
          />
        ) : articles.data?.length === 0 ? (
          <div className="rounded-2xl border bg-card/50">
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
                className="group flex items-center gap-4 rounded-xl border bg-card/70 p-5 transition-colors hover:border-secondary/40 hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="hidden size-11 shrink-0 items-center justify-center rounded-xl border bg-muted text-secondary sm:flex">
                  <BookOpen className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold">{article.title}</h2>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Обновлено <ArticleDate value={article.updated_at} />
                  </p>
                </div>
                <ArrowUpRight
                  className="size-4 shrink-0 text-muted-foreground group-hover:text-secondary"
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
