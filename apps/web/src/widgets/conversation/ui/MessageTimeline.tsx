import { Fragment } from 'react';
import { ArrowDown, ChevronUp, LoaderCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { MessageBubble } from '@/entities/message';
import { useMessageTimeline, type TimelineQuery } from '../model/useMessageTimeline';
import { dateKey, dayLabel } from '@/shared/lib/dates';

export function MessageTimeline({ query }: { query: TimelineQuery }) {
  const {
    messages,
    loadOlder,
    viewportRef,
    sentinelRef,
    shouldShowLatest,
    capturePosition: handleScroll,
    scrollToLatest: handleScrollToLatest,
  } = useMessageTimeline(query);

  const handleLoadOlder = () => void loadOlder();

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={viewportRef}
        onScroll={handleScroll}
        tabIndex={0}
        role="region"
        aria-label="Переписка"
        className="chat-scroll quiet-scroll conversation-background h-full overflow-y-auto px-4 pb-5 focus-visible:outline-2 focus-visible:outline-ring/50 md:px-8 xl:px-14"
      >
        <div className="flex min-h-full flex-col">
          <div ref={sentinelRef} className="h-px" aria-hidden="true" />
          <div className="flex min-h-14 shrink-0 items-center justify-center py-3">
            {query.isFetchNextPageError ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={handleLoadOlder}
              >
                Не удалось загрузить историю. Повторить
              </Button>
            ) : query.isFetchingNextPage ? (
              <span role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
                <LoaderCircle className="size-3.5 animate-spin" /> Загрузка истории…
              </span>
            ) : query.hasNextPage ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                disabled={query.isFetching}
                onClick={handleLoadOlder}
              >
                <ChevronUp className="size-3.5" /> Предыдущие сообщения
              </Button>
            ) : (
              <span className="text-[11px] text-muted-foreground/70">Начало переписки</span>
            )}
          </div>

          <div className="mx-auto mt-auto w-full max-w-[820px] space-y-3">
            {messages.map((message, index) => {
              const shouldShowDate =
                index === 0 || dateKey(messages[index - 1].sent_at) !== dateKey(message.sent_at);
              return (
                <Fragment key={message.id}>
                  {shouldShowDate && (
                    <div className="flex justify-center py-4">
                      <span className="rounded-full border bg-background px-3 py-1 text-[10px] font-medium text-muted-foreground">
                        {dayLabel(message.sent_at)}
                      </span>
                    </div>
                  )}
                  <MessageBubble message={message} />
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {shouldShowLatest && (
        <Button
          variant="outline"
          size="sm"
          className="absolute right-5 bottom-5 rounded-full border-[#566747] bg-card shadow-lg hover:bg-accent"
          onClick={handleScrollToLatest}
        >
          <ArrowDown className="size-3.5" /> К последним сообщениям
        </Button>
      )}
    </div>
  );
}
