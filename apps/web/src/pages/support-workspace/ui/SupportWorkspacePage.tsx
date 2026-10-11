import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { Inbox, MessageSquare, RefreshCw, Send } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { ClientsSidebar } from '@/widgets/clients-sidebar';
import { Conversation } from '@/widgets/conversation';
import { clientsQuery } from '@/entities/client';
import { cn } from '@/shared/lib/class-names';

export function SupportWorkspacePage() {
  const { clientId } = useParams({ strict: false });
  const selectedId = clientId === undefined ? null : Number(clientId);
  const clients = useQuery(clientsQuery);
  const handleRefreshClients = () => void clients.refetch();

  return (
    <div className="workspace-background flex h-dvh min-h-0 flex-col overflow-hidden">
      <header className="flex h-18 shrink-0 items-center justify-between border-b px-5 md:px-8">
        <div className="flex items-center gap-4 md:gap-6">
          <Link
            to="/clients"
            aria-label="Helpix — к списку клиентов"
            className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-ring"
          >
            <img src="/favicon.svg" alt="" className="size-8 shrink-0" aria-hidden="true" />
            <span className="text-xl font-extrabold tracking-[-0.06em]">
              helpix<span className="text-primary">.</span>
            </span>
          </Link>
          <span className="h-5 w-px bg-border" aria-hidden="true" />
          <span className="text-xs font-medium text-muted-foreground md:text-sm">
            Центр поддержки
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground sm:block">
            Рабочее пространство
          </span>
          <div
            className="flex size-8 items-center justify-center rounded-full border border-secondary/30 bg-secondary/10 text-[11px] font-bold text-secondary"
            aria-label="Оператор поддержки"
          >
            ОП
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col px-0 pt-0 pb-0 md:px-8 md:pt-6 md:pb-7">
        <div className="mb-5 hidden shrink-0 items-end justify-between md:flex">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-medium tracking-[0.15em] text-secondary/80 uppercase">
              <span className="h-px w-5 bg-secondary/70" /> Всегда на связи
            </div>
            <h1 className="text-[28px] leading-tight font-bold tracking-[-0.04em]">Сообщения</h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Все обращения клиентов — в одном месте.
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-full bg-card/50 text-xs"
                onClick={handleRefreshClients}
                disabled={clients.isFetching}
                aria-label="Обновить список клиентов"
              >
                <RefreshCw className={cn('size-3.5', clients.isFetching && 'animate-spin')} />{' '}
                Обновить
              </Button>
            </TooltipTrigger>
            <TooltipContent>Обновить список клиентов</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden border-border md:rounded-2xl md:border md:shadow-[0_20px_80px_#00000020]">
          <ClientsSidebar selectedId={selectedId} />
          {selectedId !== null ? (
            <Conversation key={selectedId} clientId={selectedId} />
          ) : (
            <section
              className="conversation-background hidden min-w-0 flex-1 flex-col items-center justify-center px-8 md:flex"
              aria-label="Выбор переписки"
            >
              <div className="relative mb-7">
                <div className="absolute -inset-6 rounded-full bg-primary/5 blur-2xl" />
                <div className="relative flex size-24 items-center justify-center rounded-[28px] border border-secondary/20 bg-[#2d3826]">
                  <MessageSquare
                    className="size-10 text-secondary"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
                <span className="absolute -right-2 -bottom-2 flex size-9 items-center justify-center rounded-xl border border-[#4c6340] bg-[#35472b]">
                  <Send className="size-4 text-primary" aria-hidden="true" />
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight">Начнём с переписки</h2>
              <p className="mt-3 max-w-72 text-center text-sm leading-relaxed text-muted-foreground">
                Выберите клиента слева, чтобы посмотреть его сообщения и историю обращения.
              </p>
              <div className="mt-7 flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-[10px] text-muted-foreground">
                <Inbox className="size-3.5" aria-hidden="true" /> Обращения из Telegram
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
