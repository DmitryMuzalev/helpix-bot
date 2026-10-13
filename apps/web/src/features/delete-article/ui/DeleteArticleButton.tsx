import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertDialog } from 'radix-ui';
import { LoaderCircle, Trash2 } from 'lucide-react';
import {
  articleQuery,
  articlesQuery,
  deleteArticle,
  type ArticleSummary,
} from '@/entities/article';
import { Button } from '@/shared/ui/button';

interface DeleteArticleButtonProps {
  article: ArticleSummary;
  onDeleted: () => void;
}

export function DeleteArticleButton({ article, onDeleted }: DeleteArticleButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const deletion = useMutation({
    mutationFn: () => deleteArticle(article.id),
    onSuccess: async () => {
      const detailKey = articleQuery(article.id).queryKey;
      await queryClient.cancelQueries({ queryKey: detailKey });
      queryClient.removeQueries({ queryKey: detailKey });
      await queryClient.invalidateQueries({ queryKey: articlesQuery.queryKey });
      setIsOpen(false);
      onDeleted();
    },
  });

  function handleOpenChange(nextIsOpen: boolean) {
    if (deletion.isPending) return;
    deletion.reset();
    setIsOpen(nextIsOpen);
  }

  return (
    <AlertDialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialog.Trigger asChild>
        <Button variant="outline" className="text-destructive">
          <Trash2 aria-hidden="true" />
          Удалить
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/65" />
        <AlertDialog.Content
          className="fixed top-1/2 left-1/2 z-50 max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl"
          onEscapeKeyDown={(event) => {
            if (deletion.isPending) event.preventDefault();
          }}
        >
          <AlertDialog.Title className="text-xl font-bold">Удалить статью?</AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
            Статья «{article.title}» будет удалена. Восстановить её через панель не получится.
          </AlertDialog.Description>
          {deletion.isError && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {deletion.error.message}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={deletion.isPending}>
                Отмена
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant="destructive"
                disabled={deletion.isPending}
                onClick={(event) => {
                  event.preventDefault();
                  if (!deletion.isPending) deletion.mutate();
                }}
              >
                {deletion.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
                {deletion.isPending ? 'Удаляем…' : 'Удалить статью'}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
