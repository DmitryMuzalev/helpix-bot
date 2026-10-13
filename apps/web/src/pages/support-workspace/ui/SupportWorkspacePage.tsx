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
    <div className="workspace-background flex h-dvh min-h-0 flex-col overflow-hidden">
      <WorkspaceHeader />

      {isRealtimeUnavailable && (
        <p role="status" className="border-b px-5 py-2 text-xs text-destructive md:px-8">
          Автообновление недоступно. Данные обновятся после восстановления соединения.
        </p>
      )}

      <main className="flex min-h-0 flex-1 flex-col px-0 pt-0 pb-0 md:px-8 md:pt-6 md:pb-7">
        <h1 className="mb-5 hidden shrink-0 text-[28px] leading-tight font-bold tracking-[-0.04em] md:block">
          Сообщения
        </h1>

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
