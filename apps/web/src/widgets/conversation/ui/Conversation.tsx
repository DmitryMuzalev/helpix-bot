import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { MessageTimeline } from './MessageTimeline';
import { StatePanel } from '@/shared/ui/StatePanel';
import { ClientAvatar, clientName, clientsQuery } from '@/entities/client';
import { useClientMessages } from '@/entities/message';
import { cn } from '@/shared/lib/class-names';

export function Conversation({ clientId }: { clientId: number }) {
  const clients = useQuery(clientsQuery);
  const messages = useClientMessages(clientId);
  const client = clients.data?.find((item) => item.id === clientId);
  const isClientMissing = clients.isSuccess && !client;
  const handleRefreshMessages = () => void messages.refetch();

  return (
    <section aria-label="Диалог с клиентом" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex min-h-21 shrink-0 items-center justify-between gap-3 border-b bg-background/80 px-4 md:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="-ml-1 shrink-0 md:hidden">
            <Link to="/clients" aria-label="Назад к клиентам">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          {client ? <ClientAvatar client={client} /> : <Skeleton className="size-11 rounded-2xl" />}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold md:text-base">
              {client
                ? clientName(client)
                : isClientMissing
                  ? 'Клиент не найден'
                  : `Клиент ${clientId}`}
            </h2>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              {client?.username ? `@${client.username}` : 'Обращение в техническую поддержку'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Badge
            variant="outline"
            className="hidden gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-normal text-muted-foreground sm:flex"
          >
            <Send className="size-3 text-secondary" aria-hidden="true" /> Telegram
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Обновить переписку"
                disabled={messages.isFetching}
                onClick={handleRefreshMessages}
                className="size-9 text-muted-foreground"
              >
                <RefreshCw className={cn('size-4', messages.isFetching && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Обновить переписку</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {isClientMissing ? (
        <StatePanel
          icon={MessageSquare}
          title="Клиент не найден"
          description="Выберите другую переписку в списке клиентов."
        />
      ) : messages.isPending ? (
        <div aria-label="Загрузка переписки" className="flex flex-1 flex-col justify-end gap-6 p-7">
          <Skeleton className="h-24 w-2/3 rounded-2xl" />
          <Skeleton className="ml-auto h-20 w-1/2 rounded-2xl" />
          <Skeleton className="h-16 w-3/5 rounded-2xl" />
        </div>
      ) : messages.isError && !messages.data ? (
        <StatePanel
          title="Переписка не загрузилась"
          description={messages.error.message}
          onRetry={handleRefreshMessages}
        />
      ) : !messages.data?.pages.some((page) => page.items.length > 0) ? (
        <StatePanel
          icon={MessageSquare}
          title="Пока нет сообщений"
          description="Здесь появятся сообщения клиента и ответы бота."
        />
      ) : (
        <MessageTimeline query={messages} />
      )}

      {messages.isRefetchError && messages.data && (
        <div role="status" className="border-t px-5 py-2 text-xs text-destructive">
          Не удалось обновить переписку. Показываем сохранённые сообщения.
        </div>
      )}
      <footer className="flex min-h-14 shrink-0 items-center justify-center gap-2 border-t px-4 text-center text-[10px] text-muted-foreground md:text-[11px]">
        <ShieldCheck className="size-3.5 shrink-0 text-secondary/60" aria-hidden="true" />
        Просмотр переписки <span aria-hidden="true">·</span> Обновляется автоматически
      </footer>
    </section>
  );
}
