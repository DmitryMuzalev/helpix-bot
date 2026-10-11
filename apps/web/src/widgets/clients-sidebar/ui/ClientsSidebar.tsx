import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Search, Users } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { StatePanel } from '@/shared/ui/StatePanel';
import { ClientAvatar, activityTime, clientName, clientsQuery } from '@/entities/client';
import { cn } from '@/shared/lib/class-names';
import { SearchClientsInput, useClientSearch } from '@/features/search-clients';

export function ClientsSidebar({ selectedId }: { selectedId: number | null }) {
  const clients = useQuery(clientsQuery);
  const {
    search,
    setSearch: handleSearchChange,
    isSearching,
    filtered,
  } = useClientSearch(clients.data ?? []);
  const handleRetryClients = () => void clients.refetch();

  return (
    <aside
      aria-label="Клиенты"
      className={cn(
        'flex min-h-0 w-full shrink-0 flex-col border-r bg-[#252822] md:w-[320px] xl:w-[352px]',
        selectedId !== null && 'hidden md:flex',
      )}
    >
      <div className="px-5 pt-6 pb-4">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold tracking-tight">Клиенты</h2>
            {clients.data && (
              <Badge variant="outline" className="rounded-md px-1.5 text-muted-foreground">
                {clients.data.length}
              </Badge>
            )}
          </div>
          <Users className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <SearchClientsInput value={search} onChange={handleSearchChange} />
      </div>

      <div className="flex items-center gap-2 px-5 pb-3 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
        <span className="size-1.5 rounded-full bg-secondary/70" />
        {isSearching ? `Найдено: ${filtered.length}` : 'Последняя активность'}
      </div>

      <div className="quiet-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {clients.isPending ? (
          <div aria-label="Загрузка клиентов" className="space-y-2 p-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 p-2">
                <Skeleton className="size-11 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : clients.isError && !clients.data ? (
          <StatePanel
            isCompact
            title="Клиенты не загрузились"
            description={clients.error.message}
            onRetry={handleRetryClients}
          />
        ) : filtered.length === 0 ? (
          <StatePanel
            isCompact
            icon={isSearching ? Search : Users}
            title={isSearching ? 'Никого не нашли' : 'Пока нет клиентов'}
            description={
              isSearching
                ? 'Попробуйте другое имя или username.'
                : 'Клиенты появятся здесь, когда напишут боту в Telegram.'
            }
          />
        ) : (
          <nav aria-label="Список клиентов" className="space-y-1">
            {filtered.map((client) => {
              const isActive = client.id === selectedId;
              return (
                <Link
                  key={client.id}
                  to="/clients/$clientId"
                  params={{ clientId: String(client.id) }}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl border border-transparent px-3 py-3.5 transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                    isActive
                      ? 'border-[#546943]/60 bg-[#35422d]'
                      : 'hover:border-border hover:bg-muted/70',
                  )}
                >
                  {isActive && (
                    <span className="absolute inset-y-5 left-0 w-0.5 rounded-full bg-secondary" />
                  )}
                  <ClientAvatar client={client} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold">
                        {clientName(client)}
                      </span>
                      <time
                        dateTime={client.last_message_at ?? undefined}
                        className={cn(
                          'shrink-0 text-[10px]',
                          isActive ? 'text-secondary' : 'text-muted-foreground',
                        )}
                      >
                        {activityTime(client.last_message_at)}
                      </time>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <MessageSquare className="size-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        {client.username ? `@${client.username}` : 'Переписка в Telegram'}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        )}
        {clients.isError && clients.data && (
          <p role="status" className="px-3 py-3 text-xs text-destructive">
            Не удалось обновить список. Показываем сохранённые данные.
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 border-t px-5 py-4 text-[11px] text-muted-foreground">
        <span className="size-1.5 rounded-full bg-primary/60" />
        Обращения из Telegram
      </div>
    </aside>
  );
}
