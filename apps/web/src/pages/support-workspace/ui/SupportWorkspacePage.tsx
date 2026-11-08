import { useParams } from '@tanstack/react-router';
import { Inbox, MessageSquare, Send } from 'lucide-react';
import { ClientsSidebar } from '@/widgets/clients-sidebar';
import { Conversation } from '@/widgets/conversation';
import { WorkspaceHeader } from '@/widgets/workspace-header';
import { useSupportRealtime } from '../model/useSupportRealtime';

export function SupportWorkspacePage() {
  const { clientId } = useParams({ strict: false });
  const selectedId = clientId === undefined ? null : Number(clientId);
  const { isRealtimeUnavailable } = useSupportRealtime(selectedId);

  return (
    <div className="workspace-background workspace-frame support-workspace flex h-dvh flex-col overflow-hidden">
      <WorkspaceHeader />

      {isRealtimeUnavailable && (
        <p role="status" className="border-b px-4 py-2 text-xs text-destructive md:px-6">
          Автообновление недоступно. Данные обновятся после восстановления соединения.
        </p>
      )}

      <main className="flex min-h-0 flex-1 flex-col md:px-5 md:pt-4 md:pb-5">
        <h1 className="mb-4 hidden shrink-0 text-2xl leading-tight font-medium md:block">
          Сообщения
        </h1>

        <div className="flex min-h-0 flex-1 overflow-hidden md:gap-3">
          <ClientsSidebar selectedId={selectedId} />
          {selectedId !== null ? (
            <Conversation key={selectedId} clientId={selectedId} />
          ) : (
            <section
              className="conversation-background hidden min-w-0 flex-1 flex-col items-center justify-center px-6 md:flex md:rounded-xl"
              aria-label="Выбор переписки"
            >
              <div className="relative mb-6">
                <div className="relative flex size-20 items-center justify-center rounded-xl bg-muted">
                  <MessageSquare
                    className="size-8 text-foreground"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
                <span className="absolute -right-2 -bottom-2 flex size-8 items-center justify-center rounded-full bg-primary">
                  <Send className="size-4 text-primary-foreground" aria-hidden="true" />
                </span>
              </div>
              <h2 className="text-lg font-medium">Начнём с переписки</h2>
              <p className="mt-3 max-w-72 text-center text-sm leading-relaxed text-muted-foreground">
                Выберите клиента слева, чтобы посмотреть его сообщения и историю обращения.
              </p>
              <div className="mt-6 flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-[10px] text-muted-foreground">
                <Inbox className="size-3.5" aria-hidden="true" /> Обращения из Telegram
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
