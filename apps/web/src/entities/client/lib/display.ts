import type { Client } from '../model/types';
import { dateKey, formatTime } from '@/shared/lib/dates';

export function clientName(client: Client): string {
  const name = [client.first_name, client.last_name].filter(Boolean).join(' ');
  return name || (client.username ? `@${client.username}` : `Клиент ${client.id}`);
}

export function clientInitials(client: Client): string {
  const names = [client.first_name, client.last_name].filter((name): name is string =>
    Boolean(name),
  );
  return names.length
    ? names
        .map((name) => Array.from(name)[0])
        .join('')
        .toLocaleUpperCase('ru')
        .slice(0, 2)
    : (client.username?.slice(0, 2).toLocaleUpperCase('ru') ?? String(client.id));
}

export function activityTime(value: string | null): string {
  if (!value) return 'Нет сообщений';
  return dateKey(value) === dateKey(new Date().toISOString())
    ? formatTime(value)
    : new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' }).format(new Date(value));
}
