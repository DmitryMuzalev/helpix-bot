import { Bot, CheckCheck } from 'lucide-react';
import { formatTime } from '@/shared/lib/dates';
import { cn } from '@/shared/lib/class-names';
import type { SupportMessage } from '../model/types';

export function MessageBubble({ message }: { message: SupportMessage }) {
  const isBot = message.sender === 'bot';
  return (
    <article
      data-message-id={message.id}
      aria-label={`${isBot ? 'Бот' : 'Клиент'}, ${formatTime(message.sent_at)}`}
      className={cn('flex', isBot ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[92%] rounded-xl border px-3.5 py-2.5 text-[13px] leading-relaxed md:max-w-[78%]',
          isBot
            ? 'rounded-br-md border-primary/40 bg-primary/15'
            : 'rounded-bl-md border-border bg-muted',
        )}
      >
        {isBot && (
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium text-highlight">
            <Bot className="size-3.5" aria-hidden="true" /> Helpix · Бот
          </div>
        )}
        <p className="break-words whitespace-pre-wrap [overflow-wrap:anywhere]">
          {message.message_text ?? 'Сообщение без текста'}
        </p>
        <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
          <time dateTime={message.sent_at}>{formatTime(message.sent_at)}</time>
          {isBot && (
            <CheckCheck className="size-3 text-highlight" aria-label="Ответ бота сохранён" />
          )}
        </div>
      </div>
    </article>
  );
}
