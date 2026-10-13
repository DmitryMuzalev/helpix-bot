import { useState, type FormEvent } from 'react';
import { LoaderCircle, Save } from 'lucide-react';
import type { Article } from '@/entities/article';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { useSaveArticle } from '../model/useSaveArticle';

interface ArticleFormProps {
  article?: Article;
  onSaved: (article: Article) => void;
  onCancel: () => void;
}

export function ArticleForm({ article, onSaved, onCancel }: ArticleFormProps) {
  const [title, setTitle] = useState(article?.title ?? '');
  const [content, setContent] = useState(article?.content ?? '');
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  const save = useSaveArticle(article?.id ?? null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.isPending) return;
    const nextErrors = {
      title: title.trim() ? undefined : 'Введите заголовок статьи.',
      content: content.trim() ? undefined : 'Введите текст статьи.',
    };
    setErrors(nextErrors);
    if (nextErrors.title || nextErrors.content) return;
    save.mutate({ title: title.trim(), content }, { onSuccess: onSaved });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6" aria-busy={save.isPending}>
      <div className="space-y-2">
        <label htmlFor="article-title" className="text-sm font-semibold">
          Заголовок
        </label>
        <Input
          id="article-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Например, как восстановить доступ"
          required
          disabled={save.isPending}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? 'article-title-error' : undefined}
          className="h-11"
        />
        {errors.title && (
          <p id="article-title-error" role="alert" className="text-sm text-destructive">
            {errors.title}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <label htmlFor="article-content" className="text-sm font-semibold">
          Текст статьи
        </label>
        <textarea
          id="article-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Опишите решение по шагам…"
          rows={12}
          required
          disabled={save.isPending}
          aria-invalid={Boolean(errors.content)}
          aria-describedby={errors.content ? 'article-content-error' : 'article-content-hint'}
          className="quiet-scroll min-h-64 w-full resize-y rounded-xl border bg-background/40 p-4 text-sm leading-7 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50 aria-invalid:border-destructive"
        />
        <p id="article-content-hint" className="text-xs text-muted-foreground">
          Обычный текст. Переносы строк и отступы сохраняются.
        </p>
        {errors.content && (
          <p id="article-content-error" role="alert" className="text-sm text-destructive">
            {errors.content}
          </p>
        )}
      </div>
      {save.isError && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {save.error.message}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 border-t pt-5">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {save.isPending ? 'Сохраняем…' : 'Сохранить статью'}
        </Button>
        <Button type="button" variant="outline" disabled={save.isPending} onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
