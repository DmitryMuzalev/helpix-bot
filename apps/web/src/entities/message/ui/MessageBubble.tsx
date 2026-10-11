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
          'max-w-[88%] rounded-2xl border px-4 py-3 text-[13px] leading-[1.7] shadow-sm md:max-w-[75%]',
          isBot
            ? 'rounded-br-md border-[#4a5e3e] bg-[#33422c]'
            : 'rounded-bl-md border-[#3c4136] bg-[#2c3028]',
        )}
      >
        {isBot && (
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold text-secondary/90">
            <Bot className="size-3.5" aria-hidden="true" /> Helpix · Бот
          </div>
        )}
        <p className="break-words whitespace-pre-wrap [overflow-wrap:anywhere]">
          {message.message_text ?? 'Сообщение без текста'}
        </p>
        <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
          <time dateTime={message.sent_at}>{formatTime(message.sent_at)}</time>
          {isBot && (
            <CheckCheck className="size-3 text-secondary/70" aria-label="Ответ бота сохранён" />
          )}
        </div>
      </div>
    </article>
  );
}
